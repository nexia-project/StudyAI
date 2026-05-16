import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

type TokenUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
};

type LogAiUsageInput = {
  userId?: string | null;
  feature: string;
  model: string;
  usage?: TokenUsage | null;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
};

type ChatCompletionLike = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: TokenUsage | null;
};

const MODEL_PRICING_USD_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "openai/gpt-4-turbo": { input: 10, output: 30 },
  "openai-direct:gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai-direct:gpt-4o": { input: 2.5, output: 10 },
  "anthropic/claude-3.5-sonnet": { input: 3, output: 15 },
  "anthropic/claude-sonnet-latest": { input: 3, output: 15 },
  "anthropic/claude-3.5-haiku": { input: 0.8, output: 4 },
  "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
  "deepseek/deepseek-r1-0528": { input: 0.55, output: 2.19 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

function toFiniteInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function normalizeModel(model: string): string {
  return model.trim().toLowerCase();
}

function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = MODEL_PRICING_USD_PER_1M_TOKENS[normalizeModel(model)];
  if (!pricing) return 0;
  return (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output;
}

function extractTokens(usage: TokenUsage | null | undefined, fallbackIn = 0, fallbackOut = 0) {
  const tokensIn = toFiniteInt(usage?.prompt_tokens ?? usage?.promptTokens ?? fallbackIn);
  const tokensOut = toFiniteInt(usage?.completion_tokens ?? usage?.completionTokens ?? fallbackOut);
  const total = toFiniteInt(usage?.total_tokens ?? usage?.totalTokens);
  if (tokensOut === 0 && total > tokensIn) return { tokensIn, tokensOut: total - tokensIn };
  return { tokensIn, tokensOut };
}

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateTokensFromMessages(messages: unknown): number {
  try {
    return estimateTokensFromText(JSON.stringify(messages ?? ""));
  } catch {
    return 0;
  }
}

function responseText(response: ChatCompletionLike): string {
  return response.choices?.map(choice => choice.message?.content ?? "").join("\n") ?? "";
}

export function logChatCompletionUsage(input: {
  userId?: string | null;
  feature: string;
  model: string;
  messages: unknown;
  response: ChatCompletionLike;
  costUsd?: number;
}): void {
  logAiUsage({
    userId: input.userId,
    feature: input.feature,
    model: input.model,
    usage: input.response.usage,
    tokensIn: estimateTokensFromMessages(input.messages),
    tokensOut: estimateTokensFromText(responseText(input.response)),
    costUsd: input.costUsd,
  });
}

export function logTextUsage(input: {
  userId?: string | null;
  feature: string;
  model: string;
  inputText?: string;
  outputText?: string;
  costUsd?: number;
}): void {
  logAiUsage({
    userId: input.userId,
    feature: input.feature,
    model: input.model,
    tokensIn: estimateTokensFromText(input.inputText ?? ""),
    tokensOut: estimateTokensFromText(input.outputText ?? ""),
    costUsd: input.costUsd,
  });
}

export function logAiUsage(input: LogAiUsageInput): void {
  const feature = input.feature.trim() || "nao_classificado";
  const model = input.model.trim() || "nao_classificado";
  const { tokensIn, tokensOut } = extractTokens(input.usage, input.tokensIn, input.tokensOut);
  const costUsd = Number.isFinite(input.costUsd)
    ? Number(input.costUsd)
    : estimateCostUsd(model, tokensIn, tokensOut);

  Promise.resolve().then(async () => {
    try {
      await db.execute(sql`
        INSERT INTO ai_cost_log (user_id, feature, model, tokens_in, tokens_out, cost_usd, created_at)
        VALUES (
          ${input.userId ?? null},
          ${feature},
          ${model},
          ${tokensIn},
          ${tokensOut},
          ${costUsd.toFixed(8)},
          NOW()
        )
      `);
    } catch (err) {
      console.warn("[aiUsageTelemetry] failed to persist ai_cost_log:", (err as Error).message);
    }
  });
}
