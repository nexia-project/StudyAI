/**
 * OpenRouter — fallback entre modelos + último recurso OpenAI direto (API oficial).
 */
import { openrouter, whisperClient, hasDirectOpenAiKey, OR } from "./aiClient";

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

/** Chave OpenRouter inválida — não adianta tentar 10 modelos */
export function isFatalAuthError(err: unknown): boolean {
  const s = stringifyOpenRouterError(err).toLowerCase();
  const e = err as { status?: number };
  return (
    e?.status === 401 ||
    e?.status === 403 ||
    s.includes("invalid api key") ||
    s.includes("incorrect api key") ||
    s.includes("unauthorized") ||
    s.includes("permission denied")
  );
}

export function isTransientProviderError(err: unknown): boolean {
  const e = err as { status?: number };
  const s = stringifyOpenRouterError(err).toLowerCase();
  return (
    e?.status === 429 ||
    e?.status === 503 ||
    s.includes("rate limit") ||
    s.includes("too many requests") ||
    s.includes("overloaded") ||
    s.includes("temporarily unavailable")
  );
}

export function isMissingModelError(err: unknown): boolean {
  const raw = stringifyOpenRouterError(err);
  const s = raw.toLowerCase();
  const e = err as { status?: number };
  return (
    e?.status === 404 ||
    /* OpenRouter devolve 400 quando o slug está errado (ex.: claude-3-5 vs claude-3.5) */
    (e?.status === 400 &&
      (s.includes("not a valid model") ||
        s.includes("invalid model id") ||
        s.includes("unknown model"))) ||
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

/** Vale tentar o próximo modelo na cadeia */
function shouldTryNextOpenRouterModel(err: unknown): boolean {
  if (isFatalAuthError(err)) return false;
  return isMissingModelError(err) || isTransientProviderError(err);
}

/** Ordem de fallback OpenRouter: visão → texto (Claude → Haiku → GPT via OR). */
export function completionFallbackChain(primary: string, hasVision: boolean): string[] {
  if (hasVision) {
    return [
      primary,
      process.env.OPENROUTER_MODEL_VISION,
      OR.pro,
      "openai/gpt-4-turbo",
      OR.mini,
    ]
      .filter((x): x is string => !!x)
      .filter((x, i, a) => a.indexOf(x) === i);
  }
  return [
    primary,
    process.env.OPENROUTER_MODEL_CLAUDE,
    /** IDs OpenRouter usam `claude-3.5-*` (ponto), nunca `claude-3-5-*` — 400 "not a valid model ID" */
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-sonnet-latest",
    "anthropic/claude-3.5-haiku",
    "anthropic/claude-3-haiku",
    OR.pro,
    "openai/gpt-4-turbo",
    OR.mini,
  ]
    .filter((x): x is string => !!x)
    .filter((x, i, a) => a.indexOf(x) === i);
}

const DIRECT_OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;

async function chatCompletionDirectOpenAi(params: {
  messages: unknown;
  max_tokens: number;
  temperature?: number;
}): Promise<{ response: { choices: Array<{ message?: { content?: string | null } }> }; modelUsed: string } | null> {
  if (!hasDirectOpenAiKey()) return null;
  let lastErr: unknown;
  for (const model of DIRECT_OPENAI_MODELS) {
    try {
      const response = await whisperClient.chat.completions.create({
        model,
        messages: params.messages as never,
        max_tokens: params.max_tokens,
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      });
      return { response, modelUsed: `openai-direct:${model}` };
    } catch (err) {
      lastErr = err;
      if (shouldTryNextOpenRouterModel(err) || isMissingModelError(err)) continue;
      if (isFatalAuthError(err)) throw err;
      continue;
    }
  }
  void lastErr;
  return null;
}

async function chatCompletionStreamDirectOpenAiAccumulate(params: {
  messages: unknown;
  max_tokens: number;
  signal?: AbortSignal;
  onChunk?: (totalChars: number) => void;
}): Promise<{ text: string; modelUsed: string } | null> {
  if (!hasDirectOpenAiKey()) return null;
  let lastErr: unknown;
  for (const model of DIRECT_OPENAI_MODELS) {
    try {
      const stream = await whisperClient.chat.completions.create(
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
        return { text: accumulated, modelUsed: `openai-direct:${model}` };
      }
      lastErr = new Error(`Resposta vazia (OpenAI direto ${model})`);
    } catch (err) {
      lastErr = err;
      if (isFatalAuthError(err)) throw err;
      if (shouldTryNextOpenRouterModel(err) || isMissingModelError(err)) continue;
      continue;
    }
  }
  void lastErr;
  return null;
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
      if (isFatalAuthError(err)) throw err;
      if (shouldTryNextOpenRouterModel(err)) continue;
      throw err;
    }
  }

  const direct = await chatCompletionDirectOpenAi({
    messages: params.messages,
    max_tokens: params.max_tokens,
    temperature: params.temperature,
  });
  if (direct) return direct;

  throw lastErr ?? new Error("Nenhum modelo de IA disponível (OpenRouter e OpenAI direto falharam).");
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
      if (isFatalAuthError(err)) throw err;
      if (shouldTryNextOpenRouterModel(err)) continue;
      throw err;
    }
  }
  throw lastErr ?? new Error("Nenhum modelo de IA disponível");
}

/**
 * Stream com fallback: OpenRouter (vários modelos) → OpenAI direto se configurado.
 */
export async function chatCompletionStreamAccumulateWithFallback(params: {
  model: string;
  messages: unknown;
  max_tokens: number;
  hasVision: boolean;
  signal?: AbortSignal;
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
      if (isFatalAuthError(err)) throw err;
      if (shouldTryNextOpenRouterModel(err)) continue;
      throw err;
    }
  }

  const direct = await chatCompletionStreamDirectOpenAiAccumulate({
    messages: params.messages,
    max_tokens: params.max_tokens,
    signal: params.signal,
    onChunk: params.onChunk,
  });
  if (direct) return direct;

  throw lastErr ?? new Error("Nenhum modelo de IA disponível (OpenRouter e OpenAI direto falharam).");
}
