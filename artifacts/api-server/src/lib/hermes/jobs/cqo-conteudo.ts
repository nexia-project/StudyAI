import {
  analyzeContentDatabases,
  buildContentIndexDescoberta,
  persistKnowledgeIndexDescoberta,
} from "./knowledge-index";
import { persistDescoberta } from "../persist";

/** CQO — qualidade de conteúdo via índice de lacunas (sem rotas HTTP de revisão). */
export async function cqoConteudoDailyLearn(): Promise<void> {
  const contentIndex = await analyzeContentDatabases();
  await persistKnowledgeIndexDescoberta("cqo_conteudo", contentIndex);

  const { descoberta, importancia } = buildContentIndexDescoberta(contentIndex);
  const cqoFocus =
    contentIndex.contentGaps.length > 0
      ? `Priorize lacunas: ${contentIndex.contentGaps.slice(0, 4).join("; ")}.`
      : "Cobertura postulado/demanda estável — monitore ratio e aulas em geração.";

  await persistDescoberta(
    "cqo_conteudo",
    `[CQO] ${descoberta} ${cqoFocus}`.trim().slice(0, 1200),
    {
      kind: "cqo_content_quality",
      contentIndex,
      lacunas: contentIndex.contentGaps,
      boardPending: contentIndex.boardLessons.generating,
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
