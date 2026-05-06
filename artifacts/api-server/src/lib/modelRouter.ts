/**
 * StudyAI — Model Router v2
 * Centralized AI model selection per task type.
 * All models routed through OpenRouter (single API key).
 * OpenAI direct only for Whisper (transcription) and TTS (voice).
 *
 * Distribution:
 *   GPT-4o-mini  → chat, flashcards, fast Q&A, summaries (cheap, fast)
 *   GPT-4o       → essay correction, document analysis, OCR, complex reasoning
 *   Claude Sonnet 4 → lesson generation, creative content, long educational docs
 */

export type TaskType =
  | "lesson-generation"   // Claude Sonnet: aula didática completa, conteúdo longo
  | "creative"            // Claude Sonnet: conteúdo criativo educacional
  | "essay-correction"    // GPT-4o: análise complexa de redação
  | "document-analysis"   // GPT-4o: documentos longos, OCR
  | "math-reasoning"      // GPT-4o: matemática, física, química (o1 não disponível no OpenRouter)
  | "deep-reasoning"      // GPT-4o: raciocínio multi-etapa complexo
  | "fast-qa"             // GPT-4o-mini: Q&A rápida
  | "flashcard"           // GPT-4o-mini: geração de flashcards
  | "summary"             // GPT-4o-mini: resumos
  | "chat";               // GPT-4o-mini: conversação Tiagão

export type Provider = "openrouter" | "openai-direct";

export type ModelConfig = {
  model: string;           // OpenRouter model slug (e.g. "openai/gpt-4o-mini")
  provider: Provider;
  maxTokens: number;
  temperature?: number;
  supportsSystemRole?: boolean;
  supportsJsonMode?: boolean;
  supportsTemperature?: boolean;
};

export const MODEL_CONFIGS: Record<TaskType, ModelConfig> = {
  "lesson-generation": {
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    maxTokens: 4096,
    temperature: 0.8,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
  "creative": {
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    maxTokens: 4096,
    temperature: 0.9,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
  "essay-correction": {
    provider: "openrouter",
    model: "openai/gpt-4o",
    maxTokens: 2048,
    temperature: 0.4,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "document-analysis": {
    provider: "openrouter",
    model: "openai/gpt-4o",
    maxTokens: 2048,
    temperature: 0.3,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "math-reasoning": {
    provider: "openrouter",
    model: "openai/gpt-4o",
    maxTokens: 3000,
    temperature: 0.3,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "deep-reasoning": {
    provider: "openrouter",
    model: "openai/gpt-4o",
    maxTokens: 4096,
    temperature: 0.3,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "fast-qa": {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    maxTokens: 1024,
    temperature: 0.7,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "flashcard": {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    maxTokens: 1200,
    temperature: 0.7,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "summary": {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    maxTokens: 1500,
    temperature: 0.5,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "chat": {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    maxTokens: 2048,
    temperature: 0.8,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
};

/** Subjects that benefit from reasoning capabilities */
const MATH_SCIENCE_SUBJECTS = new Set([
  "matemática", "matematica",
  "física", "fisica",
  "química", "quimica",
  "estatística", "estatistica",
  "trigonometria",
  "cálculo", "calculo",
  "álgebra", "algebra",
  "geometria",
  "probabilidade",
  "ciências da natureza",
  "ciencias da natureza",
]);

export function isMathScienceSubject(materia: string): boolean {
  return MATH_SCIENCE_SUBJECTS.has(materia.toLowerCase().trim());
}

export function pickSimuladoTaskType(materia: string): TaskType {
  return isMathScienceSubject(materia) ? "math-reasoning" : "fast-qa";
}

export function getModelConfig(task: TaskType): ModelConfig {
  return MODEL_CONFIGS[task];
}

/** Cost per 1M tokens (USD) for logging */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "openai/gpt-4o": { input: 2.50, output: 10.00 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.60 },
  "anthropic/claude-sonnet-4": { input: 3.00, output: 15.00 },
};
