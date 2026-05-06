/**
 * Cliente Claude compartilhado + helpers de geração premium para o StudyAI.
 *
 * Estratégia:
 *   - CLAUDE_OPUS    → conteúdo editorial premium (provas, slides, redação)
 *   - CLAUDE_SONNET  → tarefas estruturadas rápidas (banco, copilot, research)
 *   - GPT-4o fallback final se Claude indisponível
 *
 * Helpers:
 *   - claudeText(model, system, user, maxTokens)   → texto bruto
 *   - claudeJson<T>({ system, user, ... })          → JSON tipado com fallback robusto
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const CLAUDE_OPUS = "claude-opus-4-7";
export const CLAUDE_SONNET = "claude-sonnet-4-6";

export const claude = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  timeout: 90_000,
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  timeout: 90_000,
});

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

/** Chama Claude e devolve o texto bruto da primeira content block. */
export async function claudeText(
  model: string,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  const message = await claude.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = message.content[0];
  if (!block || block.type !== "text") throw new Error("Claude retornou bloco não-texto");
  return block.text;
}

interface ClaudeJsonOpts {
  system: string;
  user: string;
  /** Modelo primário. Default: Sonnet (rápido e capaz). */
  primary?: string;
  /** Modelo de fallback Claude. Default: Sonnet se primary=Opus, senão pula. */
  fallback?: string;
  /** Max tokens de saída. Default: 4096. */
  maxTokens?: number;
  /** Modelo OpenAI fallback final. Default: gpt-4o. */
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
    openaiFallback = "gpt-4o",
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

  // 3) GPT-4o fallback final
  const completion = await openai.chat.completions.create({
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
    openaiFallback = "gpt-4o",
  } = opts;

  // 1) Claude
  try {
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: user },
    ];
    const message = await claude.messages.create({
      model: primary,
      max_tokens: maxTokens,
      system,
      messages,
    });
    const block = message.content[0];
    if (block && block.type === "text") return block.text;
  } catch (err) {
    console.warn(`[claudeChat] ${primary} falhou:`, (err as Error)?.message ?? err);
  }

  // 2) GPT-4o
  const completion = await openai.chat.completions.create({
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
