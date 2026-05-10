/**
 * OpenRouter — tenta slugs alternativos quando um modelo retorna 404 / sem endpoint.
 * Os erros do SDK costumam vir aninhados (error.error / cause); por isso normalizamos o texto.
 */
import { openrouter } from "./aiClient";

/** Extrai texto pesquisável de qualquer erro do SDK / OpenRouter */
export function stringifyOpenRouterError(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  const parts: string[] = [];
  const walk = (e: unknown, depth: number) => {
    if (depth > 6 || e == null) return;
    if (typeof e === "string") {
      parts.push(e);
      return;
    }
    if (typeof e !== "object") {
      parts.push(String(e));
      return;
    }
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string") parts.push(o.message);
    if (typeof o.status === "number") parts.push(String(o.status));
    if (typeof o.code === "string") parts.push(o.code);
    if (o.error) walk(o.error, depth + 1);
    if (o.cause) walk(o.cause, depth + 1);
    if (typeof o.body === "object" && o.body) {
      try {
        parts.push(JSON.stringify(o.body));
      } catch {
        /* ignore */
      }
    }
  };
  walk(err, 0);
  return parts.join(" ");
}

export function isMissingModelError(err: unknown): boolean {
  const raw = stringifyOpenRouterError(err);
  const s = raw.toLowerCase();
  const e = err as { status?: number };
  return (
    e?.status === 404 ||
    s.includes("no endpoints") ||
    /\b404\b/.test(s) ||
    s.includes("not found") ||
    s.includes("provider returned error") ||
    s.includes("model_not_found") ||
    s.includes("does not exist") ||
    s.includes("unknown model") ||
    s.includes("invalid model") ||
    (s.includes("model") && s.includes("not available"))
  );
}

/** Ordem de fallback: visão (GPT com imagem) vs texto (Claude → Haiku → GPT). */
export function completionFallbackChain(primary: string, hasVision: boolean): string[] {
  if (hasVision) {
    return [
      primary,
      process.env.OPENROUTER_MODEL_VISION,
      "openai/gpt-4o",
      "openai/gpt-4-turbo",
      "openai/gpt-4o-mini",
    ]
      .filter((x): x is string => !!x)
      .filter((x, i, a) => a.indexOf(x) === i);
  }
  return [
    primary,
    process.env.OPENROUTER_MODEL_CLAUDE,
    "anthropic/claude-3-5-sonnet-20241022",
    "anthropic/claude-3-5-sonnet-20240620",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-haiku",
    "openai/gpt-4o",
    "openai/gpt-4-turbo",
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

/**
 * Stream com fallback completo: tenta o próximo modelo se der erro **ou** se o stream vier vazio.
 */
export async function chatCompletionStreamAccumulateWithFallback(params: {
  model: string;
  messages: unknown;
  max_tokens: number;
  hasVision: boolean;
  signal?: AbortSignal;
  /** Chamado a cada delta útil (para SSE progress no cliente). */
  onChunk?: (totalChars: number) => void;
}): Promise<{ text: string; modelUsed: string }> {
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

      let accumulated = "";
      for await (const chunk of stream as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>) {
        if (params.signal?.aborted) break;
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          accumulated += delta;
          params.onChunk?.(accumulated.length);
        }
      }

      if (accumulated.trim().length > 0) {
        return { text: accumulated, modelUsed: model };
      }

      lastErr = new Error(`Resposta vazia do modelo ${model}`);
      continue;
    } catch (err) {
      lastErr = err;
      if (isMissingModelError(err)) continue;
      throw err;
    }
  }

  throw lastErr ?? new Error("Nenhum modelo de IA disponível");
}
