import { db } from "@workspace/db";
import { aiCostLogTable } from "@workspace/db/schema";

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o":                  { input: 2.50,   output: 10.00 },
  "gpt-4o-mini":             { input: 0.150,  output: 0.600 },
  "gpt-4o-mini-2024-07-18":  { input: 0.150,  output: 0.600 },
  "gpt-4o-2024-08-06":       { input: 2.50,   output: 10.00 },
  "claude-sonnet-4-5":       { input: 3.00,   output: 15.00 },
  "claude-sonnet-4-6":       { input: 3.00,   output: 15.00 },
  "claude-haiku-4-5":        { input: 0.25,   output: 1.25  },
  "gemini-3-flash-preview":  { input: 0.075,  output: 0.30  },
  "text-embedding-3-small":  { input: 0.020,  output: 0     },
  "text-embedding-3-large":  { input: 0.130,  output: 0     },
  "whisper-1":               { input: 0,      output: 0     },
  "tts-1":                   { input: 0,      output: 0     },
  "tts-1-hd":                { input: 0,      output: 0     },
  "dall-e-3":                { input: 0,      output: 0     },
  // ── Fontes gratuitas — custo zero, rastreadas para medir economia ─────────
  "wikipedia-api":           { input: 0,      output: 0     },
  "bncc-local":              { input: 0,      output: 0     },
  "fts-kb":                  { input: 0,      output: 0     },
  "exatas-kb":               { input: 0,      output: 0     },
  "cache-semantic":          { input: 0,      output: 0     },
};

// Custo estimado que cada fonte gratuita poupa (em USD por chamada)
// Calculado como: tokens equivalentes × preço GPT-4o-mini output
export const FREE_SOURCE_SAVED_PER_CALL: Record<string, number> = {
  "wikipedia-api": 0.00018,  // ~300 tokens de conteúdo rico
  "bncc-local":    0.000075, // ~125 tokens de habilidades BNCC
  "fts-kb":        0.000225, // ~375 tokens do banco de conhecimento
  "exatas-kb":     0.000300, // ~500 tokens de fórmulas curadas por consulta
};

export function calcCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = MODEL_PRICING[model] ?? { input: 0.150, output: 0.600 };
  return (tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output;
}

export async function logAiUsage(opts: {
  feature: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  userId?: string | null;
}): Promise<void> {
  const cost = calcCostUsd(opts.model, opts.tokensIn, opts.tokensOut);
  try {
    await db.insert(aiCostLogTable).values({
      userId: opts.userId ?? null,
      feature: opts.feature,
      model: opts.model,
      tokensIn: opts.tokensIn,
      tokensOut: opts.tokensOut,
      costUsd: cost.toFixed(8),
    });
  } catch {
  }
}

/** Registra uso de fonte gratuita (Wikipedia, BNCC, FTS-KB, Exatas) de forma não-bloqueante */
export function logFreeSource(model: "wikipedia-api" | "bncc-local" | "fts-kb" | "exatas-kb", feature: string, charsReturned: number): void {
  const tokensOut = Math.round(charsReturned / 4);
  logAiUsage({ feature, model, tokensIn: 0, tokensOut }).catch(() => {});
}
