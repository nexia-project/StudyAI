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

/**
 * Compara duas strings de resposta com tolerância numérica.
 * Se ambas parsearem como número, usa tolerância relativa de 1e-6.
 * Caso contrário, compara após normalização (lowercase + sem espaços).
 */
function answersMatch(expected: string, given: string): boolean {
  const a = normalizeForCompare(expected);
  const b = normalizeForCompare(given);
  if (!a || !b) return false;
  if (a === b) return true;

  // Substring match para casos do tipo expected = "x = 2", given = "2".
  if (a.includes(b) || b.includes(a)) {
    // Mas só se a substring contiver dígito ou letra de variável
    if (/[0-9a-z]/.test(b)) return true;
  }

  const nA = Number(a);
  const nB = Number(b);
  if (Number.isFinite(nA) && Number.isFinite(nB)) {
    const tolerance = Math.max(1e-6, Math.abs(nA) * 1e-6);
    return Math.abs(nA - nB) <= tolerance;
  }
  return false;
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
  res.json({
    ...result,
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
