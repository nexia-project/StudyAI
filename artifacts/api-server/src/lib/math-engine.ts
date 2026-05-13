/**
 * math-engine.ts — Engines de Matemática (PR-7)
 *
 * Duas engines de resolução de problemas matemáticos / exatas:
 *
 *   1. Wolfram Alpha (PAGO) — só ativa se `WOLFRAM_APP_ID` estiver setado.
 *      Custo: ~US$ 2-25/mês. Retorna passo-a-passo de altíssima qualidade.
 *
 *   2. Free engine (DEFAULT) — `mathjs` + `algebrite`. Sem custo, totalmente
 *      local. Cobre álgebra simbólica, simplificação, derivadas, integrais,
 *      avaliação numérica. Qualidade boa para a maioria dos problemas de
 *      Ensino Médio / vestibular.
 *
 * Entrada principal:
 *   `solveMath(query)` — tenta Wolfram primeiro (se ativado), faz fallback
 *   para o free engine. NUNCA lança; sempre devolve um `MathResult`.
 *
 * Convenção: o campo `engine` indica qual motor produziu o resultado, ou
 * `"none"` quando nem o free engine conseguiu parsear.
 */

// `mathjs` tem types próprios — `algebrite` não publica `@types/algebrite`.
import { create, all, type MathJsInstance } from "mathjs";
// @ts-ignore — algebrite não tem types publicados
import * as algebrite from "algebrite";

// Instância dedicada do mathjs (evita poluir o global em ambiente serverless).
const math: MathJsInstance = create(all, {});

const WOLFRAM_TIMEOUT_MS = 12_000;

/** Resultado padronizado de qualquer engine matemática. */
export type MathResult = {
  /** Resultado final em texto (ex.: "x = 2" ou "42"). */
  result: string;
  /** Passos da resolução (cada item é uma string, pode conter LaTeX delimitado por `$...$`). */
  steps: string[];
  /** Representação LaTeX do resultado, quando disponível. */
  latex?: string;
  /** Qual motor produziu este resultado. */
  engine: "wolfram" | "free" | "none";
  /** Payload bruto da engine — útil para debug; opcional. */
  raw?: unknown;
};

// ─── Wolfram Alpha ───────────────────────────────────────────────────────────

interface WolframSubpod {
  title?: string;
  plaintext?: string;
}
interface WolframPod {
  title?: string;
  id?: string;
  scanner?: string;
  primary?: boolean;
  subpods?: WolframSubpod[];
}
interface WolframQueryResult {
  queryresult?: {
    success?: boolean;
    error?: boolean | { msg?: string };
    pods?: WolframPod[];
  };
}

function pickPodText(pod: WolframPod | undefined): string {
  if (!pod?.subpods) return "";
  return pod.subpods
    .map((sp) => (sp?.plaintext ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Resolve via Wolfram Alpha Full Results API.
 *
 * Devolve `null` se:
 *   - `WOLFRAM_APP_ID` não estiver setado (engine dormente).
 *   - A API responder com erro / sem `queryresult.success`.
 *   - Houver falha de rede / timeout.
 *
 * O caller deve cair para `solveWithFreeEngine` quando receber `null`.
 */
export async function solveWithWolfram(query: string): Promise<MathResult | null> {
  const appId = process.env.WOLFRAM_APP_ID;
  if (!appId || appId.trim().length === 0) return null;

  const cleaned = String(query ?? "").trim();
  if (cleaned.length === 0) return null;

  const url = new URL("https://api.wolframalpha.com/v2/query");
  url.searchParams.set("appid", appId);
  url.searchParams.set("input", cleaned);
  url.searchParams.set("output", "json");
  url.searchParams.set("format", "plaintext");
  url.searchParams.set("podstate", "Result__Step-by-step solution");

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(WOLFRAM_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[math:wolfram] HTTP ${res.status} para "${cleaned}"`);
      return null;
    }
    const json = (await res.json()) as WolframQueryResult;
    const qr = json?.queryresult;
    if (!qr || !qr.success || qr.error) {
      const msg = typeof qr?.error === "object" ? qr?.error?.msg : "no result";
      console.warn(`[math:wolfram] sem sucesso: ${msg}`);
      return null;
    }
    const pods = Array.isArray(qr.pods) ? qr.pods : [];

    const resultPod = pods.find((p) => p?.id === "Result" || p?.primary === true)
      ?? pods.find((p) => /result|solution/i.test(p?.title ?? ""));
    const stepPod = pods.find((p) =>
      /step[- ]?by[- ]?step/i.test(p?.title ?? "")
      || /step[- ]?by[- ]?step/i.test(p?.id ?? ""),
    );

    const resultText = pickPodText(resultPod);
    const stepText = pickPodText(stepPod);
    const steps = stepText
      ? stepText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [];

    if (!resultText && steps.length === 0) {
      // Nenhum pod relevante — pode ser uma query não-matemática.
      return null;
    }

    return {
      result: resultText,
      steps,
      engine: "wolfram",
      raw: json,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[math:wolfram] erro de fetch: ${msg}`);
    return null;
  }
}

// ─── Free engine (mathjs + algebrite) ────────────────────────────────────────

/** Tenta extrair LaTeX de um nó / resultado do mathjs. */
function tryLatex(node: unknown): string | undefined {
  try {
    if (node && typeof (node as { toTex?: () => string }).toTex === "function") {
      return (node as { toTex: () => string }).toTex();
    }
  } catch { /* ignore */ }
  return undefined;
}

/** Tenta cada estratégia algébrica do algebrite e retorna a primeira que diferir da entrada. */
function tryAlgebriteTransforms(expr: string): { label: string; out: string }[] {
  const out: { label: string; out: string }[] = [];
  const tries: Array<[string, string]> = [
    ["simplify", `simplify(${expr})`],
    ["factor", `factor(${expr})`],
    ["expand", `expand(${expr})`],
    ["roots", `roots(${expr})`],
    ["derivative (d/dx)", `d(${expr}, x)`],
    ["integral (∫ dx)", `integral(${expr}, x)`],
  ];
  for (const [label, cmd] of tries) {
    try {
      // @ts-ignore — sem types
      const r = algebrite.run(cmd);
      const s = String(r ?? "").trim();
      if (s && s !== expr && !/^(stop|error)/i.test(s)) {
        out.push({ label, out: s });
      }
    } catch { /* ignore individual failures */ }
  }
  return out;
}

/**
 * Resolve uma expressão usando mathjs + algebrite (sem custo, totalmente local).
 *
 * Ordem de tentativas:
 *   1. Avaliação numérica via mathjs (`evaluate`) — para expressões puramente
 *      numéricas e funções já conhecidas.
 *   2. Simplificação simbólica via mathjs (`simplify`) — para álgebra básica.
 *   3. Transformações algébricas via algebrite — simplify / factor / expand /
 *      roots / derivative / integral.
 *
 * Se nenhuma estratégia produzir algo útil, retorna `engine: "none"`.
 */
export function solveWithFreeEngine(expression: string): MathResult {
  const expr = String(expression ?? "").trim();
  if (!expr) return { result: "", steps: [], engine: "none" };

  const steps: string[] = [`Entrada: ${expr}`];
  let result = "";
  let latex: string | undefined;

  // ── 1. Avaliação numérica direta via mathjs ────────────────────────────────
  try {
    const evaluated = math.evaluate(expr);
    if (evaluated !== undefined && evaluated !== null) {
      const evalStr = math.format(evaluated, { precision: 14 });
      // Se a entrada já era um número idêntico, não é "resultado novo"; pula.
      if (evalStr && evalStr !== expr) {
        steps.push(`Avaliação numérica: ${evalStr}`);
        result = evalStr;
      }
    }
  } catch { /* expressão não puramente numérica — tudo bem */ }

  // ── 2. Simplificação simbólica via mathjs ──────────────────────────────────
  if (!result) {
    try {
      const simplified = math.simplify(expr);
      const simpStr = simplified.toString();
      if (simpStr && simpStr !== expr) {
        steps.push(`Simplificação (mathjs): ${simpStr}`);
        result = simpStr;
        latex = tryLatex(simplified);
      }
    } catch { /* ignore */ }
  }

  // ── 3. Transformações via algebrite ────────────────────────────────────────
  const algebriteResults = tryAlgebriteTransforms(expr);
  for (const { label, out } of algebriteResults) {
    steps.push(`${label}: ${out}`);
    if (!result) result = out;
  }

  if (!result) {
    return { result: "", steps: [`Não foi possível resolver: ${expr}`], engine: "none" };
  }

  return { result, steps, latex, engine: "free" };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Resolve uma pergunta matemática. NUNCA lança.
 *
 * Ordem:
 *   1. Wolfram Alpha (se `WOLFRAM_APP_ID` setado).
 *   2. Free engine (mathjs + algebrite) — sempre disponível.
 *
 * Retorna `engine: "none"` se nem o free engine conseguiu fazer nada útil.
 */
export async function solveMath(query: string): Promise<MathResult> {
  const cleaned = String(query ?? "").trim();
  if (!cleaned) return { result: "", steps: [], engine: "none" };

  const wolfram = await solveWithWolfram(cleaned);
  if (wolfram) return wolfram;

  return solveWithFreeEngine(cleaned);
}
