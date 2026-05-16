import { openrouter, OR } from "../../aiClient";
import { fetchPlatformMetrics } from "../metrics";
import { analyzeContentDatabases, persistKnowledgeIndexDescoberta } from "./knowledge-index";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";
import {
  formatHermesRecommendation,
  normalizeHermesRecommendation,
  withHermesRecommendationStandard,
  withRecommendationPayload,
  type HermesRecommendation,
} from "../recommendationStandard";

export async function gestaoDailyLearn(): Promise<void> {
  const [metricas, contentIndex] = await Promise.all([
    fetchPlatformMetrics(7),
    analyzeContentDatabases(),
  ]);
  console.info(
    "[gestao/daily-learn] content index:",
    contentIndex.knowledgeDocuments.postulados,
    "postulados,",
    contentIndex.contentGaps.length,
    "lacunas",
  );

  await persistKnowledgeIndexDescoberta("gestao", contentIndex, { metricas });
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "gestao",
    area: "gestao",
    targetSurface: "operacao/conteudo",
    observedState: `Periodo ${metricas.periodoDias}d: ${metricas.novosUsuariosPeriodo} novos usuarios, ${metricas.assinantesAtivos} assinantes ativos, ${contentIndex.contentGaps.length} lacunas.`,
    evidence: JSON.stringify({ metricas, contentGaps: contentIndex.contentGaps }),
    problemOpportunity: "Priorizar a acao operacional com maior impacto em conteudo ou funil.",
    recommendedChange: "Definir uma recomendacao unica a partir das metricas e do indice de bases.",
    expectedImpact: "Melhorar cobertura pedagogica ou saude do funil com uma proxima acao clara.",
    confidence: "media",
    successMetric: "Reducao de lacunas criticas, novos usuarios, atividade de estudo ou conversao.",
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Você é o agente de gestão do StudyAI. Sintetize UMA descoberta acionável sobre operação e cobertura de conteúdo (métricas + índice de bases). Priorize lacunas de matéria se houver. Responda JSON: { descoberta: string, importancia: 1-5, recommendation }",
        ),
      },
      { role: "user", content: JSON.stringify({ metricas, contentIndex }) },
    ],
    max_tokens: 400,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number; recommendation?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { descoberta: raw.slice(0, 500), importancia: 2 };
  }
  const recommendation = normalizeHermesRecommendation(parsed.recommendation, fallbackRecommendation);

  const descoberta =
    parsed.descoberta?.trim() ||
    formatHermesRecommendation(recommendation);

  await persistDescoberta(
    "gestao",
    descoberta,
    { metricas, contentIndex, recommendation },
    parsed.importancia ?? 2,
  );
}

export async function gestaoProactive(): Promise<void> {
  const metricas = await fetchPlatformMetrics(7);
  const anomalies: string[] = [];

  const mediaDiariaNovos = metricas.novosUsuariosPeriodo / metricas.periodoDias;
  if (mediaDiariaNovos > 0 && metricas.novosUsuariosDiaAnterior < mediaDiariaNovos * 0.4) {
    anomalies.push(
      `Cadastros de ontem (${metricas.novosUsuariosDiaAnterior}) abaixo de 40% da média diária (${mediaDiariaNovos.toFixed(1)}).`,
    );
  }
  if (metricas.totalUsuarios > 50 && metricas.atividadeEstudoPeriodo < metricas.totalUsuarios * 0.05) {
    anomalies.push(
      `Atividade de estudo baixa: ${metricas.atividadeEstudoPeriodo} registros vs ${metricas.totalUsuarios} usuários.`,
    );
  }
  if (metricas.assinantesAtivos > 0 && metricas.novosUsuariosPeriodo > 0) {
    const taxa = metricas.assinantesAtivos / metricas.totalUsuarios;
    if (taxa < 0.02 && metricas.totalUsuarios > 100) {
      anomalies.push(`Taxa de assinantes ativos muito baixa (${(taxa * 100).toFixed(1)}%).`);
    }
  }

  if (anomalies.length === 0) return;

  const descricao = anomalies.join(" ");
  const recommendation: HermesRecommendation = {
    agentId: "gestao",
    area: "gestao",
    targetSurface: "operacao/metricas",
    observedState: descricao,
    evidence: JSON.stringify({ metricas, anomalies }),
    problemOpportunity: "Anomalia operacional pode indicar queda de aquisicao, atividade ou monetizacao.",
    recommendedChange: "Investigar a anomalia nos dashboards e priorizar o fluxo afetado antes do proximo ciclo.",
    expectedImpact: "Reduzir tempo de deteccao e corrigir perda de tracao ou engajamento.",
    confidence: "alta",
    successMetric: "Metrica anomalica volta a pelo menos 80% da media do periodo anterior.",
    implementationNotes: "Cruzar com deploys, campanhas e eventos de produto do mesmo intervalo.",
  };
  const payload = withRecommendationPayload({ metricas, anomalies }, recommendation);
  await persistAcaoProativa("gestao", "anomalia_metrica", descricao, payload);
  await insertAdminInbox(
    "gestao",
    "anomalia",
    "Anomalia operacional detectada",
    descricao,
    payload,
  );
}
