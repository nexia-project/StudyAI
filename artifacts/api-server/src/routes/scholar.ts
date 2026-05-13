/**
 * Semantic Scholar Integration — RAG externo (PR-1)
 *
 * Helper + endpoint que buscam artigos peer-reviewed na Semantic Scholar Graph API.
 * Sem API key obrigatória (recomendado SEMANTIC_SCHOLAR_API_KEY em produção para
 * limites mais altos). Sem dependências novas — usa global fetch.
 *
 * Endpoint:
 *   POST /api/rag/external-search  { query, limit?, year_min?, providers? }
 *
 * Helper:
 *   searchSemanticScholar(query, opts)  → ExternalSource[]
 *
 * Observação: aiCostLogger NÃO envolve estas chamadas — não é LLM, é REST puro.
 */

import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SS_BASE = "https://api.semanticscholar.org/graph/v1";
const SS_FIELDS = "title,authors,year,venue,abstract,citationCount,openAccessPdf,externalIds,url";
const SS_TIMEOUT_MS = 12_000;

export type ExternalSource = {
  id: string;
  provider: "semantic-scholar";
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  abstract: string;
  snippet: string;
  url: string;
  doi: string | null;
  openAccessPdf: string | null;
  citationCount: number | null;
};

export interface ScholarSearchOpts {
  limit?: number;
  yearMin?: number;
}

/**
 * Busca artigos científicos na Semantic Scholar.
 * NUNCA lança — em caso de erro de rede / quota, devolve [] e loga.
 */
export async function searchSemanticScholar(
  query: string,
  opts: ScholarSearchOpts = {},
): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2) return [];

  const limit = Math.max(1, Math.min(opts.limit ?? 5, 10));
  const url = new URL(`${SS_BASE}/paper/search`);
  url.searchParams.set("query", cleaned);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", SS_FIELDS);
  if (opts.yearMin && Number.isFinite(opts.yearMin)) {
    url.searchParams.set("year", `${opts.yearMin}-`);
  }

  const headers: Record<string, string> = { "Accept": "application/json" };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(SS_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[scholar] HTTP ${res.status} para "${cleaned}"`);
      return [];
    }
    const json = (await res.json()) as { data?: unknown };
    const data: any[] = Array.isArray(json?.data) ? (json.data as any[]) : [];
    return data.map((p): ExternalSource => {
      const abs = String(p?.abstract ?? "").trim();
      const paperId = p?.paperId ?? p?.externalIds?.DOI ?? Math.random().toString(36).slice(2);
      const authors = Array.isArray(p?.authors)
        ? p.authors.map((a: any) => String(a?.name ?? "")).filter(Boolean)
        : [];
      return {
        id: `scholar:${paperId}`,
        provider: "semantic-scholar",
        title: String(p?.title ?? "Sem título"),
        authors,
        year: typeof p?.year === "number" ? p.year : null,
        venue: p?.venue ? String(p.venue) : null,
        abstract: abs,
        snippet: abs.length > 300 ? abs.slice(0, 300).trim() + "…" : abs,
        url: String(p?.url ?? `https://www.semanticscholar.org/paper/${p?.paperId ?? ""}`),
        doi: p?.externalIds?.DOI ?? null,
        openAccessPdf: p?.openAccessPdf?.url ?? null,
        citationCount: typeof p?.citationCount === "number" ? p.citationCount : null,
      };
    });
  } catch (err: any) {
    console.warn(`[scholar] erro de fetch: ${err?.message ?? err}`);
    return [];
  }
}

interface SearchPayload {
  query?: unknown;
  providers?: unknown;
  limit?: unknown;
  year_min?: unknown;
}

function validateSearchPayload(body: SearchPayload): { ok: true; query: string; limit?: number; yearMin?: number } | { ok: false; detail: string } {
  if (!body || typeof body !== "object") return { ok: false, detail: "body deve ser objeto" };
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 300) {
    return { ok: false, detail: "query: string entre 2 e 300 caracteres" };
  }
  let limit: number | undefined;
  if (body.limit !== undefined) {
    const n = Number(body.limit);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return { ok: false, detail: "limit: inteiro entre 1 e 10" };
    }
    limit = n;
  }
  let yearMin: number | undefined;
  if (body.year_min !== undefined) {
    const n = Number(body.year_min);
    if (!Number.isInteger(n) || n < 1900 || n > 2100) {
      return { ok: false, detail: "year_min: inteiro entre 1900 e 2100" };
    }
    yearMin = n;
  }
  if (body.providers !== undefined) {
    if (!Array.isArray(body.providers) || !body.providers.every(p => p === "scholar")) {
      return { ok: false, detail: "providers: array com apenas 'scholar' suportado por enquanto" };
    }
  }
  return { ok: true, query, limit, yearMin };
}

/**
 * Endpoint público de busca externa. Por enquanto agrega só Semantic Scholar
 * (PR-1). Próximos PRs: SciELO, Wikipedia, base unificada.
 */
router.post("/api/rag/external-search", async (req, res) => {
  const parsed = validateSearchPayload(req.body ?? {});
  if (!parsed.ok) {
    res.status(400).json({ error: "payload inválido", detail: parsed.detail });
    return;
  }
  const t0 = Date.now();
  const results = await searchSemanticScholar(parsed.query, {
    limit: parsed.limit,
    yearMin: parsed.yearMin,
  });
  res.json({
    query: parsed.query,
    provider: "semantic-scholar",
    results,
    ms: Date.now() - t0,
  });
});

export default router;
