/**
 * Crossref — DOIs de artigos acadêmicos (PR-4)
 *
 * Endpoint: `https://api.crossref.org/works?query=<q>&rows=<n>`.
 * Política "polite": Crossref dá rate-limit melhor quando o User-Agent
 * contém um `mailto:` — mandamos sempre.
 *
 * Documentação: https://api.crossref.org/swagger-ui/index.html
 */

import {
  DEFAULT_TIMEOUT_MS,
  truncateSnippet,
  type ExternalSource,
} from "./types.js";

const CROSSREF_BASE = "https://api.crossref.org/works";
const CROSSREF_UA = "StudyAI/1.0 (https://study.ia.br; mailto:contato@study.ia.br)";

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

interface CrossrefItem {
  DOI?: string;
  URL?: string;
  title?: string[];
  "container-title"?: string[];
  author?: CrossrefAuthor[];
  abstract?: string;
  type?: string;
  publisher?: string;
  issued?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  created?: { "date-parts"?: number[][] };
}

interface CrossrefResponse {
  status?: string;
  message?: {
    items?: CrossrefItem[];
  };
}

function pickYear(item: CrossrefItem): number | null {
  const sources = [
    item.issued?.["date-parts"]?.[0]?.[0],
    item["published-print"]?.["date-parts"]?.[0]?.[0],
    item["published-online"]?.["date-parts"]?.[0]?.[0],
    item.created?.["date-parts"]?.[0]?.[0],
  ];
  for (const y of sources) {
    if (typeof y === "number" && y > 1500 && y < 2200) return y;
  }
  return null;
}

function formatAuthor(a: CrossrefAuthor): string {
  if (a.name) return a.name;
  const given = a.given ?? "";
  const family = a.family ?? "";
  return [given, family].filter(Boolean).join(" ").trim();
}

function stripJatsTags(s: string): string {
  return s
    .replace(/<jats:[^>]*>/g, "")
    .replace(/<\/jats:[^>]*>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca obras (papers) no Crossref por texto livre. Sempre devolve array.
 */
export async function searchCrossref(
  query: string,
  limit = 5,
): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2) return [];
  const cap = Math.max(1, Math.min(limit | 0 || 5, 25));

  const url = new URL(CROSSREF_BASE);
  url.searchParams.set("query", cleaned);
  url.searchParams.set("rows", String(cap));
  url.searchParams.set(
    "select",
    "DOI,URL,title,container-title,author,abstract,type,publisher,issued,published-print,published-online,created",
  );

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": CROSSREF_UA },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[crossref] HTTP ${res.status} para "${cleaned}"`);
      return [];
    }
    const json = (await res.json()) as CrossrefResponse;
    const items: CrossrefItem[] = json.message?.items ?? [];

    return items.slice(0, cap).map((item, idx): ExternalSource => {
      const title = (item.title?.[0] ?? "Sem título").trim();
      const venue = (item["container-title"]?.[0] ?? item.publisher ?? "Crossref").toString();
      const doi = item.DOI ?? null;
      const url = item.URL ?? (doi ? `https://doi.org/${doi}` : "https://www.crossref.org/");
      const year = pickYear(item);
      const authors = (item.author ?? [])
        .map(formatAuthor)
        .filter((s): s is string => Boolean(s) && s.length > 0)
        .slice(0, 10);
      const abstract = item.abstract ? stripJatsTags(item.abstract) : "";
      const snippet = abstract
        ? truncateSnippet(abstract, 300)
        : truncateSnippet(
            `${title}${authors.length ? ` — ${authors.slice(0, 3).join(", ")}` : ""}${
              venue ? ` (${venue})` : ""
            }${year ? `, ${year}` : ""}.`,
            300,
          );
      return {
        id: `crossref:${doi ?? idx}`,
        provider: "crossref",
        title,
        snippet,
        authors,
        year,
        url,
        doi,
        venue,
        abstract,
        raw: item,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[crossref] erro de fetch: ${msg}`);
    return [];
  }
}
