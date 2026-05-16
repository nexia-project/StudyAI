export type PremiumMaterialTargetKind =
  | "bncc"
  | "enem"
  | "concurso"
  | "oab"
  | "revalida"
  | "taxonomia_interna"
  | "livre";

export type PremiumMaterialExplanationLevel = "curta" | "passo_a_passo" | "aprofundada";

export type PremiumMaterialSourceKind =
  | "rag"
  | "banco_oficial"
  | "documento_usuario"
  | "curadoria_professor"
  | "gerado_ia"
  | "outro";

export type PremiumMaterialQualityStatus =
  | "rascunho"
  | "precisa_revisao"
  | "aprovado_premium"
  | "bloqueado";

export interface PremiumMaterialSkillReference {
  kind: PremiumMaterialTargetKind;
  code?: string;
  description: string;
}

export interface PremiumMaterialCommonError {
  error: string;
  likelyCause: string;
  suggestedIntervention: string;
}

export interface PremiumMaterialExplanationLevels {
  curta?: string;
  passo_a_passo?: string;
  aprofundada?: string;
}

export interface PremiumMaterialExercise {
  statement: string;
  answer: string;
  rationale: string;
  distractors?: Array<{
    option: string;
    whyItIsPlausible: string;
    whyItIsWrong: string;
  }>;
  sourceRef?: string;
}

export interface PremiumMaterialSource {
  kind: PremiumMaterialSourceKind;
  title: string;
  citation?: string;
  url?: string;
  documentId?: string;
  verified: boolean;
}

export interface PremiumMaterialQualityScore {
  completeness: number;
  verifiability: number;
  pedagogicalFit: number;
  levelAdequacy: number;
  hallucinationRisk: number;
  total: number;
  status: PremiumMaterialQualityStatus;
  missingFields: PremiumMaterialRequiredField[];
}

export interface PremiumMaterialMetadata {
  objective: string;
  subject: string;
  targetLevel?: string;
  targetExam?: string;
  skill?: PremiumMaterialSkillReference;
  prerequisites: string[];
  keyConcepts: string[];
  vocabulary: string[];
  commonErrors: PremiumMaterialCommonError[];
  explanationLevels: PremiumMaterialExplanationLevels;
  exercises: PremiumMaterialExercise[];
  sources: PremiumMaterialSource[];
  quality?: PremiumMaterialQualityScore;
  humanReviewed?: boolean;
}

export type PremiumMaterialRequiredField =
  | "objective"
  | "subject"
  | "skill"
  | "prerequisites"
  | "keyConcepts"
  | "commonErrors"
  | "explanationLevels"
  | "exercises"
  | "sources";

export const PREMIUM_MATERIAL_REQUIRED_FIELDS: PremiumMaterialRequiredField[] = [
  "objective",
  "subject",
  "skill",
  "prerequisites",
  "keyConcepts",
  "commonErrors",
  "explanationLevels",
  "exercises",
  "sources",
];

export const PREMIUM_MATERIAL_EXPLANATION_LEVELS: PremiumMaterialExplanationLevel[] = [
  "curta",
  "passo_a_passo",
  "aprofundada",
];

export const PREMIUM_MATERIAL_QUALITY_RUBRIC = {
  completeness: "Campos pedagogicos minimos preenchidos e coerentes.",
  verifiability: "Fonte, citacao ou evidencia disponivel quando houver RAG, banco oficial ou documento do usuario.",
  pedagogicalFit: "Objetivo, habilidade, erros comuns e exercicios ajudam a ensinar, diagnosticar ou treinar.",
  levelAdequacy: "Linguagem, profundidade e exemplos aderem ao nivel/serie/prova alvo.",
  hallucinationRisk: "Baixo risco de inventar fatos, habilidade, fonte, gabarito ou justificativa.",
} as const;

export const PREMIUM_MATERIAL_STATUS_GUIDE: Record<PremiumMaterialQualityStatus, string> = {
  rascunho: "Material ainda incompleto ou sem revisao suficiente.",
  precisa_revisao: "Material tem estrutura util, mas falha em fonte, exercicio, nivel ou alinhamento pedagogico.",
  aprovado_premium: "Material atende ao padrao minimo e pode entrar em fluxo premium com revisao humana quando aplicavel.",
  bloqueado: "Material tem risco pedagogico, fonte insuficiente ou inconsistencia que impede publicacao.",
};

export const PREMIUM_MATERIAL_STANDARD_SUMMARY = {
  version: "2026-05-16",
  requiredFields: PREMIUM_MATERIAL_REQUIRED_FIELDS,
  explanationLevels: PREMIUM_MATERIAL_EXPLANATION_LEVELS,
  rubric: PREMIUM_MATERIAL_QUALITY_RUBRIC,
  statuses: PREMIUM_MATERIAL_STATUS_GUIDE,
  guardrail:
    "Nenhum material premium deve ser apenas texto bonito: precisa ensinar, diagnosticar ou treinar com fonte quando aplicavel.",
} as const;

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasExplanationLevels(levels: PremiumMaterialExplanationLevels | undefined): boolean {
  if (!levels) return false;
  return PREMIUM_MATERIAL_EXPLANATION_LEVELS.every((level) => hasText(levels[level]));
}

export function getMissingPremiumMaterialFields(
  metadata: Partial<PremiumMaterialMetadata>,
): PremiumMaterialRequiredField[] {
  const missing: PremiumMaterialRequiredField[] = [];

  if (!hasText(metadata.objective)) missing.push("objective");
  if (!hasText(metadata.subject)) missing.push("subject");
  if (!metadata.skill || !hasText(metadata.skill.description)) missing.push("skill");
  if (!hasItems(metadata.prerequisites)) missing.push("prerequisites");
  if (!hasItems(metadata.keyConcepts)) missing.push("keyConcepts");
  if (!hasItems(metadata.commonErrors)) missing.push("commonErrors");
  if (!hasExplanationLevels(metadata.explanationLevels)) missing.push("explanationLevels");
  if (!hasItems(metadata.exercises)) missing.push("exercises");
  if (!hasItems(metadata.sources)) missing.push("sources");

  return missing;
}

export function scorePremiumMaterialMetadata(
  metadata: Partial<PremiumMaterialMetadata>,
): PremiumMaterialQualityScore {
  const missingFields = getMissingPremiumMaterialFields(metadata);
  const completeness = Math.round(
    ((PREMIUM_MATERIAL_REQUIRED_FIELDS.length - missingFields.length) /
      PREMIUM_MATERIAL_REQUIRED_FIELDS.length) *
      100,
  );
  const verifiedSources = (metadata.sources ?? []).filter((source) => source.verified).length;
  const verifiability = verifiedSources > 0 ? 100 : (metadata.sources?.length ?? 0) > 0 ? 60 : 0;
  const pedagogicalFit = hasItems(metadata.commonErrors) && hasItems(metadata.exercises) ? 100 : 50;
  const levelAdequacy = hasExplanationLevels(metadata.explanationLevels) ? 100 : 40;
  const hallucinationRisk = verifiedSources > 0 ? 15 : (metadata.sources?.length ?? 0) > 0 ? 35 : 75;
  const total = Math.round(
    completeness * 0.3 +
      verifiability * 0.2 +
      pedagogicalFit * 0.25 +
      levelAdequacy * 0.15 +
      (100 - hallucinationRisk) * 0.1,
  );

  let status: PremiumMaterialQualityStatus = "rascunho";
  if (hallucinationRisk >= 70 || missingFields.includes("objective") || missingFields.includes("subject")) {
    status = "bloqueado";
  } else if (total >= 85 && missingFields.length === 0) {
    status = "aprovado_premium";
  } else if (total >= 55) {
    status = "precisa_revisao";
  }

  return {
    completeness,
    verifiability,
    pedagogicalFit,
    levelAdequacy,
    hallucinationRisk,
    total,
    status,
    missingFields,
  };
}
