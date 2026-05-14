/**
 * Concursos API — banco seed de questões de concursos públicos.
 *
 * Espelha a forma de `routes/enem-bank.ts`: validação manual, sem dependência
 * nova, sem chamada a LLM. A camada de leitura mora em `lib/concursos/bank.ts`.
 *
 * Endpoints:
 *   GET /api/concursos/questoes?query=&banca=&area=&ano=&cargo=&limit=  → busca
 *   GET /api/concursos/questoes/:id                                     → detalhe
 *   GET /api/concursos/random?banca=&area=                              → aleatória
 *   GET /api/concursos/stats                                            → contagens
 */

import { Router, type IRouter } from "express";

import {
  getConcursoQuestao,
  getConcursosSeedStats,
  getRandomConcurso,
  searchConcursos,
} from "../lib/concursos/bank";
import type { ConcursoArea, ConcursoBanca } from "../lib/concursos/types";

const router: IRouter = Router();

const VALID_BANCAS = new Set<ConcursoBanca>([
  "CEBRASPE",
  "FGV",
  "VUNESP",
  "FCC",
  "OAB",
  "OUTRO",
]);

const VALID_AREAS = new Set<ConcursoArea>([
  "DIREITO",
  "PORTUGUES",
  "MATEMATICA",
  "RACIOCINIO_LOGICO",
  "INFORMATICA",
  "ATUALIDADES",
  "LEGISLACAO",
  "OUTROS",
]);

function parseBanca(raw: unknown): { ok: true; value?: ConcursoBanca } | { ok: false; detail: string } {
  if (raw === undefined || raw === "") return { ok: true };
  if (typeof raw !== "string") return { ok: false, detail: "banca: string opcional" };
  const upper = raw.trim().toUpperCase();
  if (!VALID_BANCAS.has(upper as ConcursoBanca)) {
    return { ok: false, detail: "banca: use CEBRASPE, FGV, VUNESP, FCC, OAB ou OUTRO" };
  }
  return { ok: true, value: upper as ConcursoBanca };
}

function parseArea(raw: unknown): { ok: true; value?: ConcursoArea } | { ok: false; detail: string } {
  if (raw === undefined || raw === "") return { ok: true };
  if (typeof raw !== "string") return { ok: false, detail: "area: string opcional" };
  const upper = raw.trim().toUpperCase();
  if (!VALID_AREAS.has(upper as ConcursoArea)) {
    return {
      ok: false,
      detail:
        "area: use DIREITO, PORTUGUES, MATEMATICA, RACIOCINIO_LOGICO, INFORMATICA, ATUALIDADES, LEGISLACAO ou OUTROS",
    };
  }
  return { ok: true, value: upper as ConcursoArea };
}

function parseAno(raw: unknown): { ok: true; value?: number } | { ok: false; detail: string } {
  if (raw === undefined || raw === "") return { ok: true };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1990 || n > 2100) {
    return { ok: false, detail: "ano: inteiro entre 1990 e 2100" };
  }
  return { ok: true, value: n };
}

// ─── GET /api/concursos/questoes ─────────────────────────────────────────────
router.get("/api/concursos/questoes", (req, res) => {
  const banca = parseBanca(req.query.banca);
  if (!banca.ok) {
    res.status(400).json({ error: "banca inválida", detail: banca.detail });
    return;
  }
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

  const cargoRaw = typeof req.query.cargo === "string" ? req.query.cargo : "";
  if (cargoRaw.length > 200) {
    res.status(400).json({ error: "cargo: máximo de 200 caracteres" });
    return;
  }
  const cargo = cargoRaw.trim() || undefined;

  // Aceita `q` (alinhado a /api/enem) e também `query` (mais explícito).
  const queryRaw =
    typeof req.query.query === "string"
      ? req.query.query
      : typeof req.query.q === "string"
        ? req.query.q
        : "";
  if (queryRaw.length > 300) {
    res.status(400).json({ error: "query: máximo de 300 caracteres" });
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

  const results = searchConcursos({
    query: queryRaw || undefined,
    banca: banca.value,
    area: area.value,
    ano: ano.value,
    cargo,
    limit,
  });

  res.json({
    query: queryRaw || null,
    banca: banca.value ?? null,
    area: area.value ?? null,
    ano: ano.value ?? null,
    cargo: cargo ?? null,
    results,
    total: results.length,
    stats: getConcursosSeedStats(),
  });
});

// ─── GET /api/concursos/questoes/:id ────────────────────────────────────────
router.get("/api/concursos/questoes/:id", (req, res) => {
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ error: "id obrigatório" });
    return;
  }
  const questao = getConcursoQuestao(id);
  if (!questao) {
    res.status(404).json({ error: "questão não encontrada", id });
    return;
  }
  res.json({ questao });
});

// ─── GET /api/concursos/random ──────────────────────────────────────────────
router.get("/api/concursos/random", (req, res) => {
  const banca = parseBanca(req.query.banca);
  if (!banca.ok) {
    res.status(400).json({ error: "banca inválida", detail: banca.detail });
    return;
  }
  const area = parseArea(req.query.area);
  if (!area.ok) {
    res.status(400).json({ error: "area inválida", detail: area.detail });
    return;
  }
  const questao = getRandomConcurso({ banca: banca.value, area: area.value });
  if (!questao) {
    res.status(404).json({
      error: "sem questões para os filtros informados",
      banca: banca.value ?? null,
      area: area.value ?? null,
    });
    return;
  }
  res.json({ questao });
});

// ─── GET /api/concursos/stats ───────────────────────────────────────────────
router.get("/api/concursos/stats", (_req, res) => {
  res.json({ stats: getConcursosSeedStats() });
});

export default router;
