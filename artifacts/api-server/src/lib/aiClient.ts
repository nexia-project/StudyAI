import OpenAI from "openai";
import type { TaskType, ModelConfig } from "./modelRouter";
import { getModelConfig } from "./modelRouter";

/**
 * Unified AI client for StudyAI.
 * All chat/text generation goes through OpenRouter (OpenAI-compatible API).
 * OpenAI direct is only used for Whisper (transcription) and TTS (voice).
 */

// OpenRouter client — handles GPT and Claude models
const openrouter = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://study.ia.br",
    "X-Title": "StudyAI",
  },
});

// Export for routes that need direct tool-calling (not wrapped by aiChat)
export const openrouterClient = openrouter;

// OpenAI direct client — ONLY for Whisper and TTS
export const openaiDirect = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatOptions {
  taskType: TaskType;
  messages: ChatMessage[];
  stream?: boolean;
  jsonMode?: boolean;
}

function buildParams(config: ModelConfig, messages: ChatMessage[], jsonMode: boolean) {
  const params: any = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
  };

  if (config.supportsTemperature && config.temperature !== undefined) {
    params.temperature = config.temperature;
  }

  if (jsonMode && config.supportsJsonMode) {
    params.response_format = { type: "json_object" };
  }

  return params;
}

/**
 * Chat completion via OpenRouter (supports both GPT and Claude models).
 */
export async function aiChat(options: ChatOptions) {
  const { taskType, messages, jsonMode = false } = options;
  const config = getModelConfig(taskType);
  const params = buildParams(config, messages, jsonMode);

  const response = await openrouter.chat.completions.create(params);
  return { response, config };
}

/**
 * Streaming chat completion via OpenRouter.
 */
export async function aiChatStream(options: ChatOptions) {
  const { taskType, messages, jsonMode = false } = options;
  const config = getModelConfig(taskType);
  const params = buildParams(config, messages, jsonMode);
  params.stream = true;

  const stream = await openrouter.chat.completions.create(params);
  return { stream, config };
}

/**
 * Transcribe audio via OpenAI Whisper (direct, not OpenRouter).
 */
export async function aiTranscribe(audioFile: File | Blob, language = "pt") {
  const transcription = await openaiDirect.audio.transcriptions.create({
    file: audioFile as any,
    model: "whisper-1",
    language,
    response_format: "text",
  });
  return transcription;
}

/**
 * Generate speech/TTS via OpenAI (direct, not OpenRouter).
 */
export async function aiTTS(text: string, voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova") {
  const response = await openaiDirect.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
  });
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Calculate estimated cost in USD.
 */
export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const costs: Record<string, { input: number; output: number }> = {
    "openai/gpt-4o": { input: 2.50, output: 10.00 },
    "openai/gpt-4o-mini": { input: 0.15, output: 0.60 },
    "anthropic/claude-sonnet-4": { input: 3.00, output: 15.00 },
  };
  const c = costs[model];
  if (!c) return 0;
  return (tokensIn * c.input + tokensOut * c.output) / 1_000_000;
}
