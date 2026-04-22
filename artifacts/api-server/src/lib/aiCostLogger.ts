import { db } from "@workspace/db";
import { aiCostLogTable } from "@workspace/db/schema";

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o":                  { input: 2.50,   output: 10.00 },
  "gpt-4o-mini":             { input: 0.150,  output: 0.600 },
  "gpt-4o-mini-2024-07-18":  { input: 0.150,  output: 0.600 },
  "gpt-4o-2024-08-06":       { input: 2.50,   output: 10.00 },
  "claude-sonnet-4-6":       { input: 3.00,   output: 15.00 },
  "claude-haiku-4-5":        { input: 0.25,   output: 1.25  },
  "gemini-3-flash-preview":  { input: 0.075,  output: 0.30  },
  "text-embedding-3-small":  { input: 0.020,  output: 0     },
  "text-embedding-3-large":  { input: 0.130,  output: 0     },
  "whisper-1":               { input: 0,      output: 0     },
  "tts-1":                   { input: 0,      output: 0     },
  "tts-1-hd":                { input: 0,      output: 0     },
  "dall-e-3":                { input: 0,      output: 0     },
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
