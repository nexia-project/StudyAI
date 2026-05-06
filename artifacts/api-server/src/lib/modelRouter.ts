/**
 * StudyAI — Model Router
 * Centralized AI model selection per task type.
 *
 * Distribution target:
 *   70%  gpt-4o-mini   — fast Q&A, flashcards, chat, summaries
 *   25%  gpt-4o        — essay correction, document analysis, OCR
 *    4%  o1-mini       — math / physics / chemistry reasoning
 *    1%  o1-preview    — complex multi-step reasoning (reserved)
 *   ---  claude-sonnet — educational content, creative, long docs
 */

export type TaskType =
  | "lesson-generation"   // Claude: aula didática completa
  | "essay-correction"    // gpt-4o: análise complexa de redação
  | "document-analysis"   // gpt-4o: documentos longos, OCR
  | "math-reasoning"      // o1-mini: matemática, física, química
  | "deep-reasoning"      // o1-preview: raciocínio multi-etapa
  | "fast-qa"             // gpt-4o-mini: Q&A rápida
  | "flashcard"           // gpt-4o-mini: geração de flashcards
  | "summary"             // gpt-4o-mini: resumos
  | "creative"            // Claude: conteúdo criativo educacional
  | "chat";               // gpt-4o-mini: conversação

export type Provider = "openai" | "anthropic";

export type ModelConfig = {
  model: string;
  provider: Provider;
  maxTokens: number;
  temperature?: number;
  supportsSystemRole?: boolean;
  supportsJsonMode?: boolean;
  supportsTemperature?: boolean;
};

export const MODEL_CONFIGS: Record<TaskType, ModelConfig> = {
  "lesson-generation": {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    maxTokens: 2500,
    temperature: 0.8,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
  "creative": {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    maxTokens: 2000,
    temperature: 0.9,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
  "essay-correction": {
    provider: "openai",
    model: "gpt-4o",
    maxTokens: 2048,
    temperature: 0.4,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "document-analysis": {
    provider: "openai",
    model: "gpt-4o",
    maxTokens: 2048,
    temperature: 0.3,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "math-reasoning": {
    provider: "openai",
    model: "o1-mini",
    maxTokens: 3000,
    supportsSystemRole: false,
    supportsJsonMode: false,
    supportsTemperature: false,
  },
  "deep-reasoning": {
    provider: "openai",
    model: "o1-preview",
    maxTokens: 4096,
    supportsSystemRole: false,
    supportsJsonMode: false,
    supportsTemperature: false,
  },
  "fast-qa": {
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 1024,
    temperature: 0.7,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "flashcard": {
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 1200,
    temperature: 0.7,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "summary": {
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 1500,
    temperature: 0.5,
    supportsSystemRole: true,
    supportsJsonMode: true,
    supportsTemperature: true,
  },
  "chat": {
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 1024,
    temperature: 0.7,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
};

/** Subjects that benefit from o1-mini's reasoning capabilities */
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

/**
 * Detect if a subject warrants the math-reasoning (o1-mini) model.
 */
export function isMathScienceSubject(materia: string): boolean {
  return MATH_SCIENCE_SUBJECTS.has(materia.toLowerCase().trim());
}

/**
 * Pick the best task type for a given simulado subject.
 * Math/science → "math-reasoning" (o1-mini)
 * Others       → "fast-qa" (gpt-4o-mini)
 */
export function pickSimuladoTaskType(materia: string): TaskType {
  return isMathScienceSubject(materia) ? "math-reasoning" : "fast-qa";
}

export function getModelConfig(task: TaskType): ModelConfig {
  return MODEL_CONFIGS[task];
}
