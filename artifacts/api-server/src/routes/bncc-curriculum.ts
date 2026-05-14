/**
 * BNCC Curriculum API — PR-3 (data scaffolding).
 *
 * PR follow-up (A1): paths now canonical at /api/bncc/* (was /api/bncc/curriculum/*).
 * Legacy router (routes/bncc.ts) is re-mounted at /api/bncc/legacy and will be
 * removed in a future PR.
 *
 * Endpoints novos que expõem a representação tipada das competências BNCC do
 * Ensino Médio criada em `lib/bncc/data.ts`. Este router é montado em
 * `routes/index.ts` no caminho `/bncc` (=> `/api/bncc` externamente), portanto
 * os paths declarados abaixo são RELATIVOS (sem o prefixo /api/bncc).
 *
 * Endpoints (canônicos):
 *   GET  /api/bncc/areas          → lista as 4 áreas + competências gerais
 *   GET  /api/bncc/competencias   → busca competências específicas
 *                                   (query: area, q)
 *   POST /api/bncc/align          → alinha um tópico/tema com as
 *                                   competências mais relevantes
 *                                   (body: { topic: string, area?: string, limit?: number })
 *
 * Convenções: seguimos `routes/scholar.ts` — validação manual sem dependências
 * novas, sem aiCostLogger (não é chamada LLM), respostas JSON puras.
 */

import { Router, type IRouter } from "express";

import {
  BNCC_AREAS,
  BNCC_COMPETENCIAS_GERAIS,
  BNCC_SEED_STATS,
} from "../lib/bncc/data";
import { findBnccCompetencias, getAreaByName } from "../lib/bncc/search";

const router: IRouter = Router();

// ─── GET /api/bncc/areas ─────────────────────────────────────────────────────
router.get("/areas", (_req, res) => {
  res.json({
    areas: BNCC_AREAS,
    competenciasGerais: BNCC_COMPETENCIAS_GERAIS,
    stats: BNCC_SEED_STATS,
  });
});

// ─── GET /api/bncc/competencias?area=&q= ─────────────────────────────────────
router.get("/competencias", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const area = typeof req.query.area === "string" ? req.query.area : undefined;

  if (q.length > 300) {
    res.status(400).json({ error: "q: máximo de 300 caracteres" });
    return;
  }

  const resolvedArea = area ? getAreaByName(area) : null;
  if (area && !resolvedArea) {
    res.status(400).json({
      error: "area inválida",
      detail: "use a sigla (LGG/MAT/CNT/CHS) ou o nome oficial da área",
    });
    return;
  }

  const results = findBnccCompetencias(q, area);
  res.json({
    query: q || null,
    area: resolvedArea ?? null,
    results,
    total: results.length,
  });
});

// ─── POST /api/bncc/align ────────────────────────────────────────────────────
interface AlignPayload {
  topic?: unknown;
  area?: unknown;
  limit?: unknown;
}

function validateAlignPayload(
  body: AlignPayload,
):
  | { ok: true; topic: string; area?: string; limit: number }
  | { ok: false; detail: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, detail: "body deve ser objeto" };
  }
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < 2 || topic.length > 400) {
    return { ok: false, detail: "topic: string entre 2 e 400 caracteres" };
  }
  let area: string | undefined;
  if (body.area !== undefined) {
    if (typeof body.area !== "string") {
      return { ok: false, detail: "area: string opcional" };
    }
    area = body.area.trim() || undefined;
  }
  let limit = 5;
  if (body.limit !== undefined) {
    const n = Number(body.limit);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return { ok: false, detail: "limit: inteiro entre 1 e 10" };
    }
    limit = n;
  }
  return { ok: true, topic, area, limit };
}

router.post("/align", (req, res) => {
  const parsed = validateAlignPayload(req.body ?? {});
  if (!parsed.ok) {
    res.status(400).json({ error: "payload inválido", detail: parsed.detail });
    return;
  }

  const t0 = Date.now();
  const resolvedArea = parsed.area ? getAreaByName(parsed.area) : null;
  if (parsed.area && !resolvedArea) {
    res.status(400).json({
      error: "area inválida",
      detail: "use a sigla (LGG/MAT/CNT/CHS) ou o nome oficial da área",
    });
    return;
  }

  const hits = findBnccCompetencias(parsed.topic, parsed.area).slice(0, parsed.limit);

  res.json({
    topic: parsed.topic,
    area: resolvedArea ?? null,
    matches: hits,
    fonte: BNCC_SEED_STATS.fonte,
    ms: Date.now() - t0,
  });
});

export default router;
