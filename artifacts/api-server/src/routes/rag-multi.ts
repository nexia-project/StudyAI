/**
 * RAG Multi-fonte — Endpoint unificado (PR-4)
 *
 * POST /api/rag/external-multi
 *   body: { query: string; providers?: RagProvider[]; perProviderLimit?: number; totalLimit?: number }
 *   resp: { query, providers, sources, ms }
 *
 * GET  /api/rag/providers
 *   resp: { providers: ProviderDescriptor[] }
 *
 * IMPORTANTE:
 *   - Aditivo: NÃO substitui `POST /api/rag/external-search` do PR-1.
 *   - Sem dependência de `zod` (não é dep direta do api-server). Validação
 *     manual segue exatamente o padrão de `routes/scholar.ts` (PR-1).
 */

import { Router, type IRouter } from "express";

import {
  ALL_PROVIDERS,
  PROVIDERS,
  pickProvidersForQuery,
  searchExternalRag,
  type RagProvider,
} from "../lib/external-rag/aggregate.js";

const router: IRouter = Router();

interface MultiPayload {
  query?: unknown;
  providers?: unknown;
  perProviderLimit?: unknown;
  totalLimit?: unknown;
}

type ParseResult =
  | {
      ok: true;
      query: string;
      providers: RagProvider[];
      autoSelected: boolean;
      perProviderLimit?: number;
      totalLimit?: number;
    }
  | { ok: false; detail: string };

function isRagProvider(x: unknown): x is RagProvider {
  return typeof x === "string" && (ALL_PROVIDERS as string[]).includes(x);
}

function parsePayload(body: MultiPayload): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, detail: "body deve ser objeto" };
  }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 300) {
    return { ok: false, detail: "query: string entre 2 e 300 caracteres" };
  }

  let providers: RagProvider[] | undefined;
  let autoSelected = false;
  if (body.providers === undefined || body.providers === null) {
    providers = pickProvidersForQuery(query);
    autoSelected = true;
  } else {
    if (!Array.isArray(body.providers)) {
      return { ok: false, detail: "providers: deve ser array" };
    }
    if (body.providers.length === 0) {
      return { ok: false, detail: "providers: array não pode estar vazio" };
    }
    if (body.providers.length > 7) {
      return { ok: false, detail: "providers: máximo 7" };
    }
    const cleaned: RagProvider[] = [];
    for (const p of body.providers) {
      if (!isRagProvider(p)) {
        return {
          ok: false,
          detail: `providers: "${String(p)}" não é um provider válido (use ${ALL_PROVIDERS.join(", ")})`,
        };
      }
      if (!cleaned.includes(p)) cleaned.push(p);
    }
    providers = cleaned;
  }

  let perProviderLimit: number | undefined;
  if (body.perProviderLimit !== undefined) {
    const n = Number(body.perProviderLimit);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return { ok: false, detail: "perProviderLimit: inteiro entre 1 e 10" };
    }
    perProviderLimit = n;
  }

  let totalLimit: number | undefined;
  if (body.totalLimit !== undefined) {
    const n = Number(body.totalLimit);
    if (!Number.isInteger(n) || n < 1 || n > 30) {
      return { ok: false, detail: "totalLimit: inteiro entre 1 e 30" };
    }
    totalLimit = n;
  }

  return { ok: true, query, providers, autoSelected, perProviderLimit, totalLimit };
}

router.post("/api/rag/external-multi", async (req, res) => {
  const parsed = parsePayload((req.body ?? {}) as MultiPayload);
  if (!parsed.ok) {
    res.status(400).json({ error: "payload inválido", detail: parsed.detail });
    return;
  }
  const t0 = Date.now();
  const sources = await searchExternalRag(parsed.query, parsed.providers, {
    perProviderLimit: parsed.perProviderLimit,
    totalLimit: parsed.totalLimit,
  });
  res.json({
    query: parsed.query,
    providers: parsed.providers,
    autoSelected: parsed.autoSelected,
    sources,
    count: sources.length,
    ms: Date.now() - t0,
  });
});

router.get("/api/rag/providers", (_req, res) => {
  res.json({
    providers: PROVIDERS,
    notes: [
      "Todos os provedores listados são gratuitos e não exigem API key.",
      "Semantic Scholar aceita SEMANTIC_SCHOLAR_API_KEY opcional para limites maiores.",
      "TODO: Google Books — exigirá GOOGLE_BOOKS_API_KEY (não implementado nesta versão).",
    ],
  });
});

export default router;
