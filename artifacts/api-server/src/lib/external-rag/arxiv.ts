/**
 * arXiv — Preprints em exatas/computação (PR-4)
 *
 * Endpoint: `http://export.arxiv.org/api/query?search_query=all:<q>&start=0&max_results=<n>`
 * Resposta: Atom XML. Usamos um parser regex leve para extrair os 5 campos que
 * importam (title, summary, authors, published, id/url). Evita instalar `xml2js`
 * — a estrutura Atom do arXiv é estável e bem comportada.
 */

import {
  DEFAULT_TIMEOUT_MS,
  POLITE_UA,
  truncateSnippet,
  type ExternalSource,
} from "./types.js";

const ARXIV_BASE = "http://export.arxiv.org/api/query";

/**
 * Decodifica as 5 entidades XML básicas. arXiv não usa CDATA na maioria dos
 * campos, então isso cobre 99% dos casos.
 */
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

interface ParsedEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  url: string;
  pdfUrl: string | null;
  doi: string | null;
}

/**
 * Extrai todas as `<entry>...</entry>` do feed Atom do arXiv.
 * Não usa DOM parser para evitar deps; o formato é estável.
 */
function parseAtomEntries(xml: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1];
    const id = decodeXml(normalizeWhitespace(block.match(/<id>([\s\S]*?)<\/id>/)?.[1] ?? ""));
    const title = decodeXml(normalizeWhitespace(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""));
    const summary = decodeXml(
      normalizeWhitespace(block.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? ""),
    );
    const published = decodeXml(
      normalizeWhitespace(block.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? ""),
    );
    const authors: string[] = [];
    const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
    let am: RegExpExecArray | null;
    while ((am = authorRegex.exec(block)) !== null) {
      authors.push(decodeXml(normalizeWhitespace(am[1])));
    }

    let pdfUrl: string | null = null;
    const linkRegex = /<link\s+([^>]+)\/>/g;
    let lm: RegExpExecArray | null;
    while ((lm = linkRegex.exec(block)) !== null) {
      const attrs = lm[1];
      const titleAttr = /title=["']pdf["']/i.test(attrs);
      const typeAttr = /type=["']application\/pdf["']/i.test(attrs);
      if (titleAttr || typeAttr) {
        const href = attrs.match(/href=["']([^"']+)["']/);
        if (href) pdfUrl = href[1];
      }
    }

    const doi = decodeXml(
      normalizeWhitespace(block.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/)?.[1] ?? "") || "",
    );

    entries.push({
      id,
      title,
      summary,
      authors,
      published,
      url: id,
      pdfUrl,
      doi: doi || null,
    });
  }
  return entries;
}

/**
 * Busca preprints no arXiv. Sempre devolve array.
 */
export async function searchArxiv(query: string, limit = 5): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2) return [];
  const cap = Math.max(1, Math.min(limit | 0 || 5, 25));

  const url = new URL(ARXIV_BASE);
  url.searchParams.set("search_query", `all:${cleaned}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(cap));
  url.searchParams.set("sortBy", "relevance");
  url.searchParams.set("sortOrder", "descending");

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/atom+xml,application/xml", "User-Agent": POLITE_UA },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[arxiv] HTTP ${res.status} para "${cleaned}"`);
      return [];
    }
    const xml = await res.text();
    const entries = parseAtomEntries(xml);
    return entries.slice(0, cap).map((e): ExternalSource => {
      const year = e.published ? Number(e.published.slice(0, 4)) : null;
      return {
        id: `arxiv:${e.id.replace(/^https?:\/\/arxiv\.org\/abs\//, "")}`,
        provider: "arxiv",
        title: e.title || "Sem título",
        snippet: truncateSnippet(e.summary, 300),
        authors: e.authors,
        year: Number.isFinite(year) ? year : null,
        url: e.url || e.pdfUrl || "https://arxiv.org/",
        doi: e.doi,
        venue: "arXiv",
        abstract: e.summary,
        raw: e,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[arxiv] erro de fetch: ${msg}`);
    return [];
  }
}
