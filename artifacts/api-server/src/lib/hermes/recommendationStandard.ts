export type HermesRecommendationConfidence = "baixa" | "media" | "alta";

export interface HermesRecommendation {
  agentId: string;
  area: string;
  module?: string;
  targetSurface: string;
  observedState: string;
  evidence: string;
  problemOpportunity: string;
  recommendedChange: string;
  expectedImpact: string;
  confidence: HermesRecommendationConfidence;
  successMetric: string;
  implementationNotes?: string;
  acceptanceCriteria?: string[];
}

export const HERMES_RECOMMENDATION_JSON_FIELD =
  "recommendation: { agentId: string, area: string, module?: string, targetSurface: string, observedState: string, evidence: string, problemOpportunity: string, recommendedChange: string, expectedImpact: string, confidence: 'baixa'|'media'|'alta', successMetric: string, implementationNotes?: string, acceptanceCriteria?: string[] }";

export const HERMES_RECOMMENDATION_STANDARD_PT = `PADRAO HERMES PARA RECOMENDACOES (obrigatorio para qualquer sugestao, acao, descoberta ou recomendacao):
- Seja especifico e auditavel; nao recomende mudancas genericas.
- Toda recomendacao deve preservar: agente/area; modulo premium quando houver; superficie, rota ou componente analisado; estado atual observado/evidencia; problema ou oportunidade; mudanca especifica; impacto esperado; confianca; metrica/como medir sucesso; notas de implementacao ou criterios de aceite quando aplicavel.
- Para o loop premium, module deve ser um destes quando aplicavel: Landing, Home, Notebook RAG, Simulado, Tiagao ou Caderno de Erros.
- Para Notebook RAG, inspecione explicitamente qualidade de display/exportacao: preview formatado, PDF/print, preservacao de HTML/Markdown, imagens, tabelas, cores, quebras de pagina, objetivos pedagogicos, exemplos, exercicios/gabarito e metricas de qualidade do material.
- Para Notebook RAG multimodal, qualquer recomendacao deve citar: tipo de material, preferencias selecionadas, evidencia/fonte, problema de qualidade (generico, sem visual, fonte fraca, fallback, erro de export), mudanca concreta, impacto esperado, metrica e criterios de aceite.
- Se responder JSON, inclua o campo ${HERMES_RECOMMENDATION_JSON_FIELD}.`;

export function withHermesRecommendationStandard(systemPrompt: string): string {
  return `${systemPrompt}\n\n${HERMES_RECOMMENDATION_STANDARD_PT}`;
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length > 0) {
      return value.map((item) => String(item)).join("; ").trim();
    }
  }
  return undefined;
}

function normalizeConfidence(value: unknown, fallback: HermesRecommendationConfidence): HermesRecommendationConfidence {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (normalized === "alta" || normalized === "high") return "alta";
  if (normalized === "media" || normalized === "medio" || normalized === "medium") return "media";
  if (normalized === "baixa" || normalized === "low") return "baixa";
  return fallback;
}

export function normalizeHermesRecommendation(
  input: unknown,
  fallback: HermesRecommendation,
): HermesRecommendation {
  if (!input || typeof input !== "object") return fallback;
  const obj = input as Record<string, unknown>;

  return {
    agentId: pickString(obj, ["agentId", "agent", "agente"]) ?? fallback.agentId,
    area: pickString(obj, ["area"]) ?? fallback.area,
    module: pickString(obj, ["module", "modulo", "premiumModule", "moduloPremium"]) ?? fallback.module,
    targetSurface:
      pickString(obj, ["targetSurface", "surface", "target", "superficie", "modulo", "rota", "componente"]) ??
      fallback.targetSurface,
    observedState:
      pickString(obj, ["observedState", "currentState", "estadoAtual", "observacao"]) ??
      fallback.observedState,
    evidence: pickString(obj, ["evidence", "evidencia", "dados"]) ?? fallback.evidence,
    problemOpportunity:
      pickString(obj, ["problemOpportunity", "problem", "opportunity", "problema", "oportunidade"]) ??
      fallback.problemOpportunity,
    recommendedChange:
      pickString(obj, ["recommendedChange", "recommendation", "change", "mudanca", "acao", "sugestao"]) ??
      fallback.recommendedChange,
    expectedImpact:
      pickString(obj, ["expectedImpact", "impact", "impactoEsperado", "impacto"]) ??
      fallback.expectedImpact,
    confidence: normalizeConfidence(obj.confidence ?? obj.confianca, fallback.confidence),
    successMetric:
      pickString(obj, ["successMetric", "metric", "metrica", "kpi", "measure"]) ??
      fallback.successMetric,
    implementationNotes:
      pickString(obj, ["implementationNotes", "notes", "notasImplementacao", "notas"]) ??
      fallback.implementationNotes,
    acceptanceCriteria: Array.isArray(obj.acceptanceCriteria)
      ? obj.acceptanceCriteria.map((item) => String(item)).filter(Boolean)
      : Array.isArray(obj.criteriosAceite)
        ? obj.criteriosAceite.map((item) => String(item)).filter(Boolean)
        : fallback.acceptanceCriteria,
  };
}

export function formatHermesRecommendation(recommendation: HermesRecommendation): string {
  const parts = [
    `[${recommendation.agentId}/${recommendation.area}] ${recommendation.module ? `${recommendation.module} · ` : ""}${recommendation.targetSurface}`,
    `Estado/evidencia: ${recommendation.observedState} (${recommendation.evidence})`,
    `Problema/oportunidade: ${recommendation.problemOpportunity}`,
    `Mudanca recomendada: ${recommendation.recommendedChange}`,
    `Impacto esperado: ${recommendation.expectedImpact}`,
    `Confianca: ${recommendation.confidence}`,
    `Medir sucesso: ${recommendation.successMetric}`,
  ];

  if (recommendation.implementationNotes) {
    parts.push(`Notas: ${recommendation.implementationNotes}`);
  }
  if (recommendation.acceptanceCriteria?.length) {
    parts.push(`Aceite: ${recommendation.acceptanceCriteria.join("; ")}`);
  }

  return parts.join(" | ");
}

export function withRecommendationPayload(
  payload: Record<string, unknown> | undefined,
  recommendation: HermesRecommendation,
): Record<string, unknown> {
  return { ...(payload ?? {}), recommendation };
}
