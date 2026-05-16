import {
  analyzeContentDatabases,
  buildContentIndexDescoberta,
  persistKnowledgeIndexDescoberta,
} from "./knowledge-index";
import { persistDescoberta } from "../persist";
import { formatHermesRecommendation, type HermesRecommendation } from "../recommendationStandard";

/** CQO — qualidade de conteúdo via índice de lacunas (sem rotas HTTP de revisão). */
export async function cqoConteudoDailyLearn(): Promise<void> {
  const contentIndex = await analyzeContentDatabases();
  await persistKnowledgeIndexDescoberta("cqo_conteudo", contentIndex);

  const { descoberta, importancia } = buildContentIndexDescoberta(contentIndex);
  const cqoFocus =
    contentIndex.contentGaps.length > 0
      ? `Priorize lacunas: ${contentIndex.contentGaps.slice(0, 4).join("; ")}.`
      : "Cobertura postulado/demanda estável — monitore ratio e aulas em geração.";
  const recommendation: HermesRecommendation = {
    agentId: "cqo_conteudo",
    area: "qualidade_conteudo",
    targetSurface: "indice-de-conhecimento",
    observedState: `${descoberta} ${cqoFocus}`.trim(),
    evidence: JSON.stringify({
      lacunas: contentIndex.contentGaps,
      postulados: contentIndex.knowledgeDocuments.postulados,
      boardPending: contentIndex.boardLessons.generating,
    }),
    problemOpportunity:
      contentIndex.contentGaps.length > 0
        ? "Lacunas de conteudo podem reduzir qualidade das respostas e materiais."
        : "A qualidade do indice depende de monitoramento continuo de cobertura.",
    recommendedChange:
      contentIndex.contentGaps.length > 0
        ? `Curar ou ingerir conteudo para: ${contentIndex.contentGaps.slice(0, 4).join("; ")}.`
        : "Manter revisao de cobertura e aulas em geracao.",
    expectedImpact: "Aumentar confiabilidade pedagogica das respostas e geracoes.",
    confidence: contentIndex.contentGaps.length > 0 ? "alta" : "media",
    successMetric: "Menos lacunas no contentIndex e maior cobertura de postulados.",
    implementationNotes: "Priorize metadados consistentes de materia/source nos documentos.",
  };

  await persistDescoberta(
    "cqo_conteudo",
    `[CQO] ${formatHermesRecommendation(recommendation)}`.trim().slice(0, 1200),
    {
      kind: "cqo_content_quality",
      contentIndex,
      lacunas: contentIndex.contentGaps,
      boardPending: contentIndex.boardLessons.generating,
      recommendation,
    },
    importancia,
  );

  console.info(
    "[cqo_conteudo/daily-learn]",
    contentIndex.contentGaps.length,
    "lacunas,",
    contentIndex.knowledgeDocuments.postulados,
    "postulados",
  );
}
