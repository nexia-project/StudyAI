/**
 * StudyAI — Central AI Client
 * Chat completions → OpenRouter (Claude Sonnet + DeepSeek).
 * Heavy content → Claude Sonnet via OpenRouter (mesmo interface do antigo Gemini).
 * Whisper + TTS → OpenAI Replit proxy.
 */
import OpenAI from "openai";

// ── OpenRouter client — ALL chat.completions calls ────────────────────────────
export const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY ?? "dummy",
  defaultHeaders: {
    "HTTP-Referer": "https://study.ia.br",
    "X-Title": "StudyAI",
  },
});

// ── OpenAI proxy — Whisper (transcrição) + TTS (voz) ─────────────────────────
export const whisperClient = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
});

// ── Model constants ───────────────────────────────────────────────────────────
export const OR = {
  fast:       "deepseek/deepseek-v4-flash",      // rápido e barato
  pro:        "deepseek/deepseek-v4-pro",         // alta qualidade
  reasoning:  "deepseek/deepseek-r1-0528",        // raciocínio
  materials:  "deepseek/deepseek-chat-v3-0324",   // conteúdo longo
  premium:    "openai/gpt-4o",                    // GPT-4o (visão + premium)
  claude:     "anthropic/claude-sonnet-4",        // geração de conteúdo pesado
  claudeFast: "anthropic/claude-3-haiku",         // Claude rápido
} as const;

export type ORModel = (typeof OR)[keyof typeof OR];

// Aliases para compatibilidade
export const openai = openrouter;
export const openaiProxy = whisperClient;

/**
 * generateWithGemini — mantido para compatibilidade retroativa.
 * Agora usa Claude Sonnet via OpenRouter (mesma interface, mesmo resultado).
 * Chamado por: notebook.ts, studio-ia.ts, tiagao-agent.ts
 */
export async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 16000,
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
