/**
 * Wikidata — Fatos estruturados (PR-4)
 *
 * Endpoint: `https://www.wikidata.org/w/api.php?action=wbsearchentities`.
 * Já devolve `label` + `description` + `concepturi`, então uma única
 * chamada basta. Para fatos mais ricos (P-statements) é melhor usar SPARQL
 * — fica como TODO se precisarmos.
 */

import {
  DEFAULT_TIMEOUT_MS,
  POLITE_UA,
  stripHtml,
  truncateSnippet,
  type ExternalSource,
} from "./types.js";

interface WikidataEntity {
  id: string;
  label?: string;
  description?: string;
  concepturi?: string;
  url?: string;
  aliases?: string[];
  match?: { type?: string; text?: string };
}

interface WikidataResponse {
  search?: WikidataEntity[];
}

/**
 * Busca entidades estruturadas no Wikidata. Sempre devolve array.
 */
export async function searchWikidata(
  query: string,
  lang: string = "pt",
  limit = 5,
): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2) return [];
  const safeLang = /^[a-z-]{2,10}$/.test(lang) ? lang : "pt";
  const cap = Math.max(1, Math.min(limit | 0 || 5, 15));

  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", cleaned);
  url.searchParams.set("language", safeLang);
  url.searchParams.set("uselang", safeLang);
  url.searchParams.set("type", "item");
  url.searchParams.set("limit", String(cap));
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": POLITE_UA },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[wikidata] HTTP ${res.status} para "${cleaned}"`);
      return [];
    }
    const json = (await res.json()) as WikidataResponse;
    const entities = Array.isArray(json.search) ? json.search : [];

    return entities.slice(0, cap).map((e): ExternalSource => {
      const label = stripHtml(e.label ?? "");
      const desc = stripHtml(e.description ?? "");
      const conceptUrl =
        e.concepturi ??
        e.url ??
        `https://www.wikidata.org/wiki/${e.id}`;
      const snippet = desc ? `${label} — ${desc}` : label;
      return {
        id: `wikidata:${e.id}`,
        provider: "wikidata",
        title: label || e.id,
        snippet: truncateSnippet(snippet, 300),
        url: conceptUrl.startsWith("//") ? `https:${conceptUrl}` : conceptUrl,
        venue: "Wikidata",
        abstract: desc,
        raw: e,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[wikidata] erro de fetch: ${msg}`);
    return [];
  }
}
