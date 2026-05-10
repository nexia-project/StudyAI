/**
 * StudyAI — Central AI Client
 *
 * Slugs são sempre os da UI OpenRouter (`provedor/modelo`). Para Anthropic use `claude-3.5-*`
 * (ponto), nunca `claude-3-5-*` — senão 400 "not a valid model ID".
 *
 * Overrides opcionais (Railway): só defina se a OpenRouter mudar o nome do modelo.
 *   OPENROUTER_MODEL_MINI, OPENROUTER_MODEL_PRO, OPENROUTER_MODEL_VISION,
 *   OPENROUTER_MODEL_CLAUDE, OPENROUTER_MODEL_CLAUDE_FAST, OPENROUTER_MODEL_REASONING
 *
 * Distribuição (custo-benefício):
 *   mini / fast   → gpt-4o-mini (OpenRouter: openai/gpt-4o-mini)
 *   pro / premium → gpt-4o
 *   reasoning     → deepseek-r1
 *   claude        → Claude Sonnet (qualidade educacional)
 *   claudeFast    → Claude Haiku (rápido / barato)
 *
 * Dois clientes apenas:
 *   openrouter    — TODOS os chat.completions (GPT, Claude, DeepSeek via OpenRouter)
 *   whisperClient — APENAS Whisper (STT) e TTS (OpenAI direto)
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
// Se OPENAI_API_KEY real está set → usa api.openai.com diretamente.
// Se só AI_INTEGRATIONS_OPENAI_API_KEY (Replit proxy) → usa o base URL do proxy.
const _whisperBase = process.env.OPENAI_API_KEY
  ? "https://api.openai.com/v1"
  : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1");
const _whisperKey =
  process.env.OPENAI_API_KEY ??
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
  "dummy";
export const whisperClient = new OpenAI({
  baseURL: _whisperBase,
  apiKey: _whisperKey,
});

/** true quando há chave OpenAI real (fallback direto se OpenRouter falhar em todos os modelos). */
export function hasDirectOpenAiKey(): boolean {
  const k =
    process.env.OPENAI_API_KEY ??
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    "";
  return Boolean(k && k !== "dummy" && k.length > 12);
}

// ── Model constants (uma fonte de verdade — rotas usam OR.*) ─────────────────
export const OR = {
  mini: process.env.OPENROUTER_MODEL_MINI ?? "openai/gpt-4o-mini",
  fast: process.env.OPENROUTER_MODEL_MINI ?? "openai/gpt-4o-mini",
  materials: process.env.OPENROUTER_MODEL_MINI ?? "openai/gpt-4o-mini",

  pro: process.env.OPENROUTER_MODEL_PRO ?? "openai/gpt-4o",
  premium: process.env.OPENROUTER_MODEL_PRO ?? "openai/gpt-4o",

  vision: process.env.OPENROUTER_MODEL_VISION ?? "openai/gpt-4o",

  reasoning:
    process.env.OPENROUTER_MODEL_REASONING ?? "deepseek/deepseek-r1-0528",

  claude: process.env.OPENROUTER_MODEL_CLAUDE ?? "anthropic/claude-3.5-sonnet",
  claudeFast:
    process.env.OPENROUTER_MODEL_CLAUDE_FAST ??
    "anthropic/claude-3.5-haiku",
};

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

  const { chatCompletionCreateWithFallback } = await import("./openrouterFallback");
  const { response } = await chatCompletionCreateWithFallback({
    model: OR.claude,
    messages,
    max_tokens: Math.min(maxOutputTokens, 8000),
    hasVision: false,
    temperature: 0.65,
  });

  return response.choices[0]?.message?.content ?? "";
}
