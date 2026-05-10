/**
 * StudyAI — Claude helpers (via OpenRouter — sem SDK Anthropic direto)
 *
 * Estratégia de modelos:
 *   CLAUDE_OPUS    → conteúdo editorial premium (provas, slides, redação)
 *   CLAUDE_SONNET  → tarefas estruturadas rápidas (banco, copilot, research)
 *   Fallback final → gpt-4o via OpenRouter se Claude indisponível
 *
 * Helpers:
 *   claudeText(model, system, user, maxTokens)   → texto bruto
 *   claudeJson<T>({ system, user, ... })          → JSON tipado com fallback robusto
 *   claudeChat({ system, user, history, ... })    → texto livre com histórico
 */

import { openrouter, OR } from "./aiClient";

// Modelos Claude via OpenRouter (prefixo anthropic/)
export const CLAUDE_OPUS   = "anthropic/claude-3-opus";
/** Alias estável — mesmo slug default que `OR.claude` (env OPENROUTER_MODEL_CLAUDE). */
export const CLAUDE_SONNET = OR.claude;

function jsonClean(raw: string): string {
  return raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

/** Extrai o maior bloco JSON válido de uma resposta possivelmente verbosa. */
export function extractJson(raw: string): string {
  const cleaned = jsonClean(raw);
  try { JSON.parse(cleaned); return cleaned; } catch { /* try fallback */ }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { JSON.parse(match[0]); return match[0]; } catch { /* keep cleaned */ }
  }
  return cleaned;
}

/** Chama Claude via OpenRouter e devolve o texto bruto. */
export async function claudeText(
  model: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  const completion = await openrouter.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("OpenRouter/Claude retornou resposta vazia");
  return content;
}

interface ClaudeJsonOpts {
  system: string;
  user: string;
  /** Modelo primário. Default: Sonnet. */
  primary?: string;
  /** Modelo de fallback Claude. Default: Sonnet se primary=Opus, senão pula. */
  fallback?: string;
  /** Max tokens de saída. Default: 4096. */
  maxTokens?: number;
  /** Modelo OpenRouter fallback final. Default: gpt-4o. */
  openaiFallback?: string;
}

/**
 * Gera JSON com fallback completo: primary → fallback Claude → GPT-4o.
 * Lança erro só se TODOS falharem.
 */
export async function claudeJson<T = any>(opts: ClaudeJsonOpts): Promise<T> {
  const {
    system,
    user,
    primary = CLAUDE_SONNET,
    fallback,
    maxTokens = 4096,
    openaiFallback = "openai/gpt-4o",
  } = opts;

  const fallbackChain = fallback ?? (primary === CLAUDE_OPUS ? CLAUDE_SONNET : null);

  // 1) primary
  try {
    const raw = await claudeText(primary, system, user, maxTokens);
    return JSON.parse(extractJson(raw)) as T;
  } catch (err) {
    console.warn(`[claudeJson] primary ${primary} falhou:`, (err as Error)?.message ?? err);
  }

  // 2) Claude fallback
  if (fallbackChain) {
    try {
      const raw = await claudeText(fallbackChain, system, user, maxTokens);
      return JSON.parse(extractJson(raw)) as T;
    } catch (err) {
      console.warn(`[claudeJson] fallback ${fallbackChain} falhou:`, (err as Error)?.message ?? err);
    }
  }

  // 3) GPT-4o fallback final via OpenRouter
  const completion = await openrouter.chat.completions.create({
    model: openaiFallback,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}

/**
 * Texto livre (não-JSON) com fallback Claude → GPT-4o.
 */
export async function claudeChat(opts: {
  system: string;
  user: string;
  history?: { role: "user" | "assistant"; content: string }[];
  primary?: string;
  maxTokens?: number;
  openaiFallback?: string;
}): Promise<string> {
  const {
    system,
    user,
    history = [],
    primary = CLAUDE_SONNET,
    maxTokens = 2048,
    openaiFallback = "openai/gpt-4o",
  } = opts;

  // 1) Claude via OpenRouter
  try {
    const completion = await openrouter.chat.completions.create({
      model: primary,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: user },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (content) return content;
  } catch (err) {
    console.warn(`[claudeChat] ${primary} falhou:`, (err as Error)?.message ?? err);
  }

  // 2) GPT-4o fallback via OpenRouter
  const completion = await openrouter.chat.completions.create({
    model: openaiFallback,
    temperature: 0.6,
    messages: [
      { role: "system", content: system },
      ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: user },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}
