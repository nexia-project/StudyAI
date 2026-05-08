/**
 * StudyAI — Central AI Client
 *
 * Distribuição de modelos (custo-benefício):
 *   mini / fast  → openai/gpt-4o-mini      — chat, Q&A, flashcards, resumos, materiais (barato)
 *   pro / premium→ openai/gpt-4o           — redação, visão, análise de documentos (qualidade)
 *   reasoning    → deepseek/deepseek-r1-0528 — matemática, física, química (raciocínio)
 *   claude       → anthropic/claude-sonnet-4 — conteúdo educacional pesado (máxima qualidade)
 *   claudeFast   → anthropic/claude-3-haiku  — Claude rápido e barato
 *
 * Dois clientes apenas:
 *   openrouter   — TODOS os chat.completions (GPT, Claude, DeepSeek via OpenRouter)
 *   whisperClient— APENAS Whisper (STT) e TTS (OpenAI direto)
 */
import OpenAI from "openai";

// ── OpenRouter client — ALL chat.completions calls ────────────────────────────
export const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "dummy",
  defaultHeaders: {
    "HTTP-Referer": "https://study.ia.br",
    "X-Title": "StudyAI",
  },
});

// ── OpenAI direto — Whisper (transcrição) + TTS (voz do Tiagão) ──────────────
// SEMPRE usa https://api.openai.com/v1 — o proxy Replit (AI_INTEGRATIONS_OPENAI_BASE_URL)
// só suporta chat.completions e rejeita /audio/speech e /audio/transcriptions com 400.
export const whisperClient = new OpenAI({
  baseURL: "https://api.openai.com/v1",
  apiKey:
    process.env.OPENAI_API_KEY ??
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    "dummy",
});

// ── Model constants ───────────────────────────────────────────────────────────
export const OR = {
  // Rápido e barato — maioria das tarefas
  mini:       "openai/gpt-4o-mini",
  fast:       "openai/gpt-4o-mini",          // alias de mini
  materials:  "openai/gpt-4o-mini",          // resumos e materiais

  // Qualidade — análise complexa, redação
  pro:        "openai/gpt-4o",
  premium:    "openai/gpt-4o",               // alias de pro

  // Visão — modelo confiável para image_url no OpenRouter
  // openai/gpt-4o às vezes retorna "No endpoints found that support image input"
  vision:     "google/gemini-2.0-flash-001",

  // Raciocínio — matemática, física, química
  reasoning:  "deepseek/deepseek-r1-0528",

  // Claude via OpenRouter — conteúdo educacional pesado
  // Use the stable 3.5-sonnet slug — claude-sonnet-4 is not yet on OR
  claude:     "anthropic/claude-3.5-sonnet",
  claudeFast: "anthropic/claude-3-haiku",
} as const;

export type ORModel = (typeof OR)[keyof typeof OR];

// Aliases para compatibilidade
export const openai = openrouter;
export const openaiProxy = whisperClient;

/**
 * generateWithGemini — mantido para compatibilidade retroativa.
 * Usa Claude Sonnet via OpenRouter — melhor qualidade para conteúdo educacional.
 * Chamado por: notebook.ts, studio-ia.ts, tiagao-agent.ts
 */
export async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 8000,
  sourceContext?: string,
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (sourceContext) {
    messages.push({
      role: "user",
      content: `FONTES DE REFERÊNCIA (use estas como base principal):\n\n${sourceContext}`,
    });
    messages.push({
      role: "assistant",
      content: "Entendido. Vou usar estas fontes como base principal.",
    });
  }

  messages.push({ role: "user", content: userPrompt });

  const completion = await openrouter.chat.completions.create({
    model: OR.claude,
    messages,
    max_tokens: Math.min(maxOutputTokens, 8000),
    temperature: 0.65,
  });

  return completion.choices[0]?.message?.content ?? "";
}
