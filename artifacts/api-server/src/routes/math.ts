/**
 * Math Routes — Resolução de Matemática / Exatas (PR-7)
 *
 * Endpoints REST que expõem as engines de `lib/math-engine.ts`. Sem auth
 * própria (segue o padrão de `routes/scholar.ts`): a rate-limit é aplicada no
 * `app.ts` no prefixo `/api`. As chamadas NÃO são LLM — são CAS puro (mathjs
 * + algebrite) ou REST para Wolfram Alpha.
 *
 * Endpoints:
 *   POST /api/math/solve  { query }                       → MathResult
 *   POST /api/math/check  { problem, studentAnswer }      → CheckResult
 *
 * Validação: zod. Respostas de erro: { error, detail } com status 400.
 */

import { Router, type IRouter } from "express";
import { z } from "zod";
import { solveMath, type MathResult } from "../lib/math-engine";
import {
  detectGeometryKind,
  detectGraphableFunction,
  type GeometryKind,
} from "../lib/math-detection";

// ─── Visual enrichment (PR-8) ────────────────────────────────────────────────

/**
 * Payload aditivo devolvido junto do `MathResult` quando a engine de detecção
 * identifica geometria espacial / função plotável no enunciado original.
 *
 * Frontend (MathRender + GeoGebraEmbed + MathGraph) consome `visual.kind` para
 * decidir qual widget montar abaixo da resolução textual.
 */
export type MathVisualPayload =
  | {
      kind: "geogebra";
      geometry: { kind: Exclude<GeometryKind, null>; suggestedTool: "3d" | "2d" };
    }
  | {
      kind: "function-plot";
      plot: { expr: string; varName: string; xMin: number; xMax: number };
    }
  | { kind: null };

/**
 * Decide qual widget visual sugerir para um enunciado em PT-BR.
 * Primeiro tenta geometria (mais específico); só cai para função quando não
 * há sinal de geometria — assim "área de uma circunferência" vai pro GeoGebra,
 * não para function-plot.
 */
export function computeMathVisual(question: string): MathVisualPayload {
  const geoKind = detectGeometryKind(question);
  if (geoKind) {
    const is3d = geoKind === "solido" || geoKind === "vetor" || geoKind === "plano";
    return {
      kind: "geogebra",
      geometry: { kind: geoKind, suggestedTool: is3d ? "3d" : "2d" },
    };
  }
  const fn = detectGraphableFunction(question);
  if (fn) {
    return {
      kind: "function-plot",
      plot: { expr: fn.expr, varName: fn.varName, xMin: -10, xMax: 10 },
    };
  }
  return { kind: null };
}

const router: IRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const solveSchema = z.object({
  query: z.string().min(1, "query vazia").max(2000, "query muito longa"),
});

const checkSchema = z.object({
  problem: z.string().min(1, "problem vazio").max(2000, "problem muito longo"),
  studentAnswer: z
    .string()
    .min(1, "studentAnswer vazia")
    .max(2000, "studentAnswer muito longa"),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeForCompare(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[,]/g, ".")
    .trim();
}

const normalizedNumberPattern = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?$/i;

function parseNormalizedNumber(s: string): number | null {
  if (!normalizedNumberPattern.test(s)) return null;
  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

function numbersMatch(expected: number, given: number): boolean {
  const tolerance = Math.max(1e-6, Math.abs(expected) * 1e-6);
  return Math.abs(expected - given) <= tolerance;
}

function equationAnswerMatches(equation: string, answer: string): boolean {
  const eqIndex = equation.lastIndexOf("=");
  if (eqIndex < 0) return false;

  const rhs = equation.slice(eqIndex + 1);
  if (!rhs) return false;
  if (rhs === answer) return true;

  const rhsNumber = parseNormalizedNumber(rhs);
  const answerNumber = parseNormalizedNumber(answer);
  return rhsNumber !== null && answerNumber !== null && numbersMatch(rhsNumber, answerNumber);
}

/**
 * Compara duas strings de resposta com tolerância numérica.
 * Se ambas parsearem como número, usa tolerância relativa de 1e-6.
 * Caso contrário, compara após normalização (lowercase + sem espaços).
 */
export function answersMatch(expected: string, given: string): boolean {
  const a = normalizeForCompare(expected);
  const b = normalizeForCompare(given);
  if (!a || !b) return false;
  if (a === b) return true;

  const nA = parseNormalizedNumber(a);
  const nB = parseNormalizedNumber(b);
  if (nA !== null && nB !== null) {
    return numbersMatch(nA, nB);
  }

  // Aceita "x = 2" vs "2" sem permitir que "10" case com "1".
  return equationAnswerMatches(a, b) || equationAnswerMatches(b, a);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/math/solve
 * Resolve um problema matemático. Tenta Wolfram (se ativado) → free engine.
 * Sempre retorna 200 com um MathResult (o campo `engine` indica o motor;
 * `engine === "none"` significa que nada deu certo, mas é resposta válida).
 */
router.post("/api/math/solve", async (req, res) => {
  const parsed = solveSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "payload inválido",
      detail: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return;
  }
  const t0 = Date.now();
  const result: MathResult = await solveMath(parsed.data.query);
  // PR-8 — anexa sugestão de widget visual (3D via GeoGebra / 2D via function-plot).
  // É aditivo: consumidores antigos podem ignorar; o campo existe sempre, com
  // `kind: null` quando nem geometria nem função foram detectadas.
  const visual = computeMathVisual(parsed.data.query);
  res.json({
    ...result,
    visual,
    ms: Date.now() - t0,
  });
});

/**
 * POST /api/math/check
 * Compara a resposta do aluno com a resposta canônica calculada pela engine.
 * Retorna { correct, expected, given, steps, engine }.
 */
router.post("/api/math/check", async (req, res) => {
  const parsed = checkSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "payload inválido",
      detail: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return;
  }
  const { problem, studentAnswer } = parsed.data;
  const t0 = Date.now();
  const canonical = await solveMath(problem);
  const expected = canonical.result;
  const correct = answersMatch(expected, studentAnswer);
  res.json({
    correct,
    expected,
    given: studentAnswer,
    steps: canonical.steps,
    engine: canonical.engine,
    ms: Date.now() - t0,
  });
});

export const mathRouter = router;
export default router;
