/**
 * ENEM Bank API — PR-3 (data scaffolding).
 *
 * Expõe o banco seed de questões ENEM como API consultável. Não chama LLM —
 * é estrutura pura, sem aiCostLogger. Validação manual no estilo
 * `routes/scholar.ts` (sem dependências novas).
 *
 * Endpoints:
 *   GET /api/enem/questoes?area=&ano=&q=&limit=  → busca / lista questões
 *   GET /api/enem/questoes/:id                   → detalhe + gabarito + resolução
 *   GET /api/enem/random?area=&ano=              → questão aleatória ("questão do dia")
 */

import { Router, type IRouter } from "express";

import {
  getEnemSeedStats,
  getQuestao,
  getRandomQuestao,
  searchEnem,
} from "../lib/enem/bank";
import type { EnemArea, EnemAno } from "../lib/enem/types";

const router: IRouter = Router();

const VALID_AREAS = new Set<EnemArea>(["LC", "MT", "CN", "CH", "R"]);

function parseArea(raw: unknown): { ok: true; value?: EnemArea } | { ok: false; detail: string } {
  if (raw === undefined || raw === "") return { ok: true };
  if (typeof raw !== "string") return { ok: false, detail: "area: string opcional" };
  const upper = raw.trim().toUpperCase();
  if (!VALID_AREAS.has(upper as EnemArea)) {
    return { ok: false, detail: "area: use LC, MT, CN, CH ou R" };
  }
  return { ok: true, value: upper as EnemArea };
}

function parseAno(raw: unknown): { ok: true; value?: EnemAno } | { ok: false; detail: string } {
  if (raw === undefined || raw === "") return { ok: true };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2009 || n > 2100) {
    return { ok: false, detail: "ano: inteiro entre 2009 e 2100" };
  }
  return { ok: true, value: n };
}

// ─── GET /api/enem/questoes ──────────────────────────────────────────────────
router.get("/api/enem/questoes", (req, res) => {
  const area = parseArea(req.query.area);
  if (!area.ok) {
    res.status(400).json({ error: "area inválida", detail: area.detail });
    return;
  }
  const ano = parseAno(req.query.ano);
  if (!ano.ok) {
    res.status(400).json({ error: "ano inválido", detail: ano.detail });
    return;
  }

  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (q.length > 300) {
    res.status(400).json({ error: "q: máximo de 300 caracteres" });
    return;
  }

  let limit = 20;
  if (req.query.limit !== undefined) {
    const n = Number(req.query.limit);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      res.status(400).json({ error: "limit: inteiro entre 1 e 50" });
      return;
    }
    limit = n;
  }

  const results = searchEnem({
    query: q || undefined,
    area: area.value,
    ano: ano.value,
    limit,
  });

  res.json({
    query: q || null,
    area: area.value ?? null,
    ano: ano.value ?? null,
    results,
    total: results.length,
    stats: getEnemSeedStats(),
  });
});

// ─── GET /api/enem/questoes/:id ─────────────────────────────────────────────
router.get("/api/enem/questoes/:id", (req, res) => {
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ error: "id obrigatório" });
    return;
  }
  const questao = getQuestao(id);
  if (!questao) {
    res.status(404).json({ error: "questão não encontrada", id });
    return;
  }
  res.json({ questao });
});

// ─── GET /api/enem/random ───────────────────────────────────────────────────
router.get("/api/enem/random", (req, res) => {
  const area = parseArea(req.query.area);
  if (!area.ok) {
    res.status(400).json({ error: "area inválida", detail: area.detail });
    return;
  }
  const ano = parseAno(req.query.ano);
  if (!ano.ok) {
    res.status(400).json({ error: "ano inválido", detail: ano.detail });
    return;
  }

  const questao = getRandomQuestao({ area: area.value, ano: ano.value });
  if (!questao) {
    res.status(404).json({
      error: "sem questões para os filtros informados",
      area: area.value ?? null,
      ano: ano.value ?? null,
    });
    return;
  }

  res.json({ questao });
});

export default router;
