/**
 * SciELO — Brazilian/Latin American Scientific Articles (PR-4)
 *
 * SciELO publica em PT-BR/ES/EN. A API JSON pública é o endpoint de busca
 * (search.scielo.org) que devolve um payload AJAX semi-estruturado.
 * Como a API "oficial" REST é instável, usamos o endpoint `?output=site&format=summary`
 * que retorna JSON quando aceita `application/json`.
 *
 * Fallback: se o JSON falhar, devolvemos []. NUNCA lançamos.
 */

import {
  DEFAULT_TIMEOUT_MS,
  POLITE_UA,
  stripHtml,
  truncateSnippet,
  type ExternalSource,
} from "./types.js";

const SCIELO_SEARCH = "https://search.scielo.org/";

/** Resposta crua aproximada do endpoint de busca do SciELO. */
interface ScieloHit {
  id?: string;
  ti?: string | string[];
  ti_pt?: string | string[];
  ti_en?: string | string[];
  ab?: string | string[];
  ab_pt?: string | string[];
  ab_en?: string | string[];
  au?: string[];
  da?: string | string[];
  publication_year?: string | number;
  doi?: string;
  ur?: string | string[];
  fulltext_pdf_pt?: string;
  fulltext_pdf_en?: string;
}

interface ScieloResponse {
  diaServerResponse?: Array<{
    response?: {
      docs?: ScieloHit[];
    };
  }>;
  response?: { docs?: ScieloHit[] };
}

function pickStr(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? "");
  if (v === null || v === undefined) return "";
  return String(v);
}

function pickAbstract(hit: ScieloHit): string {
  return pickStr(hit.ab_pt) || pickStr(hit.ab) || pickStr(hit.ab_en);
}

function pickTitle(hit: ScieloHit): string {
  return pickStr(hit.ti_pt) || pickStr(hit.ti) || pickStr(hit.ti_en) || "Sem título";
}

function pickYear(hit: ScieloHit): number | null {
  const raw =
    typeof hit.publication_year === "number"
      ? hit.publication_year
      : Number(pickStr(hit.publication_year) || pickStr(hit.da).slice(0, 4));
  return Number.isFinite(raw) && raw > 1500 && raw < 2200 ? raw : null;
}

function pickUrl(hit: ScieloHit): string {
  const fromUr = pickStr(hit.ur);
  if (fromUr.startsWith("http")) return fromUr;
  if (hit.id) return `https://search.scielo.org/?q=${encodeURIComponent(hit.id)}`;
  return "https://search.scielo.org/";
}

/**
 * Busca artigos no SciELO. Sempre devolve um array (vazio em caso de erro).
 */
export async function searchSciELO(
  query: string,
  limit = 10,
): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2) return [];

  const cap = Math.max(1, Math.min(limit | 0 || 10, 25));
  const url = new URL(SCIELO_SEARCH);
  url.searchParams.set("q", cleaned);
  url.searchParams.set("lang", "pt");
  url.searchParams.set("count", String(cap));
  url.searchParams.set("from", "0");
  url.searchParams.set("output", "site");
  url.searchParams.set("format", "summary");
  url.searchParams.set("fb", "");
  url.searchParams.set("page", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "User-Agent": POLITE_UA,
        "X-Requested-With": "XMLHttpRequest",
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[scielo] HTTP ${res.status} para "${cleaned}"`);
      return [];
    }
    const text = await res.text();
    let parsed: ScieloResponse | null = null;
    try {
      parsed = JSON.parse(text) as ScieloResponse;
    } catch {
      // SciELO às vezes devolve JSONP / HTML — tenta extrair JSON de dentro
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]) as ScieloResponse;
        } catch {
          parsed = null;
        }
      }
    }
    if (!parsed) {
      console.warn(`[scielo] resposta não-JSON para "${cleaned}"`);
      return [];
    }
    const docs: ScieloHit[] =
      parsed.diaServerResponse?.[0]?.response?.docs ??
      parsed.response?.docs ??
      [];

    return docs.slice(0, cap).map((hit, idx): ExternalSource => {
      const title = stripHtml(pickTitle(hit));
      const abstract = stripHtml(pickAbstract(hit));
      const year = pickYear(hit);
      const doi = hit.doi ? String(hit.doi) : null;
      const authors = Array.isArray(hit.au)
        ? hit.au.map((a) => String(a)).filter(Boolean).slice(0, 8)
        : [];
      const id = hit.id ?? doi ?? `scielo-${idx}-${Date.now()}`;
      return {
        id: `scielo:${id}`,
        provider: "scielo",
        title,
        snippet: truncateSnippet(abstract, 300),
        authors,
        year,
        url: pickUrl(hit),
        doi,
        venue: "SciELO",
        abstract,
        raw: hit,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[scielo] erro de fetch: ${msg}`);
    return [];
  }
}
