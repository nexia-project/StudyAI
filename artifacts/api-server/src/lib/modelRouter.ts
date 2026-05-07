/**
 * StudyAI — Model Router
 * Seleção centralizada de modelos por tipo de tarefa.
 *
 * Distribuição (custo-benefício):
 *   ~65%  openai/gpt-4o-mini  — chat, Q&A, flashcards, resumos, materiais
 *   ~25%  openai/gpt-4o       — redação, documentos, visão/OCR
 *   ~ 8%  anthropic/claude-*  — geração de conteúdo educacional pesado
 *   ~ 2%  deepseek-r1-0528    — matemática, física, química (raciocínio)
 */

export type TaskType =
  | "lesson-generation"   // Claude: aula didática completa
  | "essay-correction"    // gpt-4o: análise complexa de redação
  | "document-analysis"   // gpt-4o: documentos longos, OCR
  | "math-reasoning"      // deepseek-r1: matemática, física, química
  | "deep-reasoning"      // gpt-4o: raciocínio complexo
  | "fast-qa"             // gpt-4o-mini: Q&A rápida
  | "flashcard"           // gpt-4o-mini: geração de flashcards
  | "summary"             // gpt-4o-mini: resumos
  | "creative"            // Claude: conteúdo criativo educacional
  | "chat";               // gpt-4o-mini: conversação

export type Provider = "openrouter" | "openai";

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
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    maxTokens: 2500,
    temperature: 0.8,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
  "creative": {
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4",
    maxTokens: 2000,
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
    model: "deepseek/deepseek-r1-0528",
    maxTokens: 3000,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: false,
  },
  "deep-reasoning": {
    provider: "openrouter",
    model: "openai/gpt-4o",
    maxTokens: 4096,
    temperature: 0.4,
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
    maxTokens: 1024,
    temperature: 0.7,
    supportsSystemRole: true,
    supportsJsonMode: false,
    supportsTemperature: true,
  },
};

/** Matérias que se beneficiam de DeepSeek R1 (raciocínio matemático) */
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
 * Detecta se uma matéria precisa do modelo de raciocínio (DeepSeek R1).
 */
export function isMathScienceSubject(materia: string): boolean {
  return MATH_SCIENCE_SUBJECTS.has(materia.toLowerCase().trim());
}

/**
 * Escolhe o tipo de tarefa ideal para um simulado.
 * Exatas → "math-reasoning" (DeepSeek R1)
 * Humanas → "fast-qa" (GPT-4o-mini)
 */
export function pickSimuladoTaskType(materia: string): TaskType {
  return isMathScienceSubject(materia) ? "math-reasoning" : "fast-qa";
}

export function getModelConfig(task: TaskType): ModelConfig {
  return MODEL_CONFIGS[task];
}
