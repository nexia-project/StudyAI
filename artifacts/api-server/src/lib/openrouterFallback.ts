/**
 * OpenRouter — tenta slugs alternativos quando o modelo retorna 404 / sem endpoint.
 */
import { openrouter } from "./aiClient";

export function isMissingModelError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  const msg = String(e?.message ?? err);
  return (
    e?.status === 404 ||
    msg.includes("No endpoints") ||
    msg.includes("404") ||
    /not found/i.test(msg) ||
    /provider returned error/i.test(msg)
  );
}

/** Ordem de fallback: visão (GPT com imagem) vs texto (Claude → Haiku → GPT mini). */
export function completionFallbackChain(primary: string, hasVision: boolean): string[] {
  if (hasVision) {
    return [
      primary,
      process.env.OPENROUTER_MODEL_VISION,
      "openai/gpt-4o",
      "openai/gpt-4-turbo",
    ]
      .filter((x): x is string => !!x)
      .filter((x, i, a) => a.indexOf(x) === i);
  }
  return [
    primary,
    process.env.OPENROUTER_MODEL_CLAUDE,
    "anthropic/claude-3-5-sonnet-20241022",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-haiku",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
  ]
    .filter((x): x is string => !!x)
    .filter((x, i, a) => a.indexOf(x) === i);
}

export async function chatCompletionCreateWithFallback(params: {
  model: string;
  messages: unknown;
  max_tokens: number;
  hasVision: boolean;
  temperature?: number;
}): Promise<{ response: { choices: Array<{ message?: { content?: string | null } }> }; modelUsed: string }> {
  const chain = completionFallbackChain(params.model, params.hasVision);
  let lastErr: unknown;
  for (const model of chain) {
    try {
      const response = await openrouter.chat.completions.create({
        model,
        messages: params.messages as never,
        max_tokens: params.max_tokens,
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      });
      return { response, modelUsed: model };
    } catch (err) {
      lastErr = err;
      if (isMissingModelError(err)) continue;
      throw err;
    }
  }
  throw lastErr ?? new Error("Nenhum modelo de IA disponível");
}

export async function chatCompletionStreamCreateWithFallback(params: {
  model: string;
  messages: unknown;
  max_tokens: number;
  hasVision: boolean;
  signal?: AbortSignal;
}): Promise<{ stream: AsyncIterable<unknown>; modelUsed: string }> {
  const chain = completionFallbackChain(params.model, params.hasVision);
  let lastErr: unknown;
  for (const model of chain) {
    try {
      const stream = await openrouter.chat.completions.create(
        {
          model,
          messages: params.messages as never,
          max_tokens: params.max_tokens,
          stream: true,
        },
        { signal: params.signal },
      );
      return { stream: stream as AsyncIterable<unknown>, modelUsed: model };
    } catch (err) {
      lastErr = err;
      if (isMissingModelError(err)) continue;
      throw err;
    }
  }
  throw lastErr ?? new Error("Nenhum modelo de IA disponível");
}
