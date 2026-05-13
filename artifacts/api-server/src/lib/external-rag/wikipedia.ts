/**
 * Wikipedia (PT-BR padrão) — RAG fonte gratuita (PR-4)
 *
 * Fluxo (1 request com generator+extract — barato):
 *   action=query
 *     &generator=search
 *     &gsrsearch=<q>
 *     &gsrlimit=<limit>
 *     &prop=extracts|info
 *     &exintro=1
 *     &explaintext=1
 *     &exchars=500
 *     &inprop=url
 *     &format=json
 *     &utf8=1
 *
 * O endpoint devolve `query.pages` indexado por pageid — montamos snippets
 * a partir do `extract` (texto puro) já no primeiro hit, sem N+1.
 */

import {
  DEFAULT_TIMEOUT_MS,
  POLITE_UA,
  stripHtml,
  truncateSnippet,
  type ExternalSource,
} from "./types.js";

interface WikiPage {
  pageid: number;
  ns: number;
  title: string;
  extract?: string;
  fullurl?: string;
  canonicalurl?: string;
  index?: number;
}

interface WikiQueryResponse {
  query?: {
    pages?: Record<string, WikiPage>;
  };
}

/**
 * Busca artigos na Wikipédia (default PT-BR). Sempre devolve array.
 */
export async function searchWikipedia(
  query: string,
  lang: string = "pt",
  limit = 5,
): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2) return [];
  const safeLang = /^[a-z-]{2,10}$/.test(lang) ? lang : "pt";
  const cap = Math.max(1, Math.min(limit | 0 || 5, 15));

  const url = new URL(`https://${safeLang}.wikipedia.org/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", cleaned);
  url.searchParams.set("gsrlimit", String(cap));
  url.searchParams.set("prop", "extracts|info");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exchars", "500");
  url.searchParams.set("inprop", "url");
  url.searchParams.set("format", "json");
  url.searchParams.set("utf8", "1");
  url.searchParams.set("origin", "*");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": POLITE_UA },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[wikipedia] HTTP ${res.status} para "${cleaned}"`);
      return [];
    }
    const json = (await res.json()) as WikiQueryResponse;
    const pages = json.query?.pages ?? {};
    const items = Object.values(pages);
    items.sort((a, b) => (a.index ?? 9999) - (b.index ?? 9999));

    return items.slice(0, cap).map((p): ExternalSource => {
      const extract = stripHtml(p.extract ?? "");
      const url = p.fullurl ?? p.canonicalurl ?? `https://${safeLang}.wikipedia.org/?curid=${p.pageid}`;
      return {
        id: `wiki:${safeLang}:${p.pageid}`,
        provider: "wikipedia",
        title: p.title || "Sem título",
        snippet: truncateSnippet(extract, 300),
        url,
        venue: `Wikipédia (${safeLang})`,
        abstract: extract,
        raw: p,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[wikipedia] erro de fetch: ${msg}`);
    return [];
  }
}
