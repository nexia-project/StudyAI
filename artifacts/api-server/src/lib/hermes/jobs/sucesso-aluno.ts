import { openrouter, OR } from "../../aiClient";
import { fetchInactiveUserPatterns } from "../retention-metrics";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";
import {
  formatHermesRecommendation,
  normalizeHermesRecommendation,
  withHermesRecommendationStandard,
  withRecommendationPayload,
  type HermesRecommendation,
} from "../recommendationStandard";

export async function sucessoAlunoDailyLearn(): Promise<void> {
  const patterns = await fetchInactiveUserPatterns(14);
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "sucesso_aluno",
    area: "retencao/CS",
    targetSurface: "coorte/assinantes-inativos",
    observedState: `${patterns.assinantesSemEstudo} assinante(s) sem estudo nos ultimos ${patterns.periodoDias}d; ${patterns.usuariosSemAtividadeNunca} usuarios nunca registraram atividade.`,
    evidence: JSON.stringify(patterns),
    problemOpportunity: "Inatividade recente pode antecipar churn e baixa ativacao.",
    recommendedChange: "Definir intervencao segmentada para usuarios sem atividade recente.",
    expectedImpact: "Aumentar retorno ao estudo e reduzir risco de cancelamento.",
    confidence: patterns.assinantesSemEstudo > 0 ? "alta" : "media",
    successMetric: "Usuarios reativados em 7 dias, sessoes de estudo e retencao de assinantes.",
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Agente sucesso_aluno (retenção/CS) do StudyAI. Analise padrões de inatividade e risco de churn. JSON: { descoberta: string, importancia: 1-5, recommendation }",
        ),
      },
      { role: "user", content: JSON.stringify(patterns) },
    ],
    max_tokens: 450,
    temperature: 0.25,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number; recommendation?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      descoberta: `${patterns.assinantesSemEstudo} assinante(s) sem estudo nos últimos ${patterns.periodoDias}d; ${patterns.usuariosSemAtividadeNunca} nunca registraram atividade.`,
      importancia: patterns.assinantesSemEstudo > 0 ? 3 : 2,
    };
  }
  const recommendation = normalizeHermesRecommendation(parsed.recommendation, fallbackRecommendation);

  await persistDescoberta(
    "sucesso_aluno",
    parsed.descoberta?.trim() || formatHermesRecommendation(recommendation),
    { kind: "retention_patterns", patterns, recommendation },
    parsed.importancia ?? 2,
  );

  console.info(
    "[sucesso_aluno/daily-learn]",
    patterns.assinantesSemEstudo,
    "assinantes sem estudo,",
    patterns.amostraAssinantesEmRisco.length,
    "amostra em risco",
  );
}

export async function sucessoAlunoProactive(): Promise<void> {
  const patterns = await fetchInactiveUserPatterns(7);

  if (patterns.assinantesAtivos < 1) return;
  if (patterns.assinantesSemEstudo < 1) return;

  const taxa =
    patterns.assinantesAtivos > 0
      ? patterns.assinantesSemEstudo / patterns.assinantesAtivos
      : 0;

  if (taxa < 0.15 && patterns.assinantesSemEstudo < 2) return;

  const descricao = `${patterns.assinantesSemEstudo} de ${patterns.assinantesAtivos} assinante(s) sem atividade de estudo nos últimos ${patterns.periodoDias} dias (${(taxa * 100).toFixed(0)}%).`;
  const recommendation: HermesRecommendation = {
    agentId: "sucesso_aluno",
    area: "retencao/CS",
    targetSurface: "coorte/assinantes-inativos",
    observedState: descricao,
    evidence: JSON.stringify({
      assinantesSemEstudo: patterns.assinantesSemEstudo,
      assinantesAtivos: patterns.assinantesAtivos,
      periodoDias: patterns.periodoDias,
      amostra: patterns.amostraAssinantesEmRisco,
    }),
    problemOpportunity: "Parcela relevante de assinantes ativos esta sem atividade de estudo recente.",
    recommendedChange: "Disparar plano de reengajamento com email, in-app e oferta de sessao guiada.",
    expectedImpact: "Aumentar retomada de estudo e reduzir churn na coorte em risco.",
    confidence: "alta",
    successMetric: "Percentual da amostra com atividade de estudo em ate 7 dias.",
    implementationNotes: "Gerar mensagens pela fila Hermes antes de qualquer envio real.",
    acceptanceCriteria: [
      "Mensagem personalizada criada para a coorte",
      "Reativacao medida por user_activity no periodo de 7 dias",
    ],
  };

  const payload = withRecommendationPayload({
    patterns,
    sugestoes: [
      { acao: "email_reengajamento", prioridade: "alta" },
      { acao: "oferta_sessao_guiada", prioridade: "media" },
      { acao: "revisar_onboarding", prioridade: "baixa" },
    ],
  }, recommendation);

  await persistAcaoProativa("sucesso_aluno", "risco_churn", descricao, payload);

  const { enqueueTask } = await import("../tasks/queue");
  await enqueueTask("sucesso_aluno", "mensagem", {
    source: "hourly_proactive",
    descricao,
    patterns,
  }).catch((e) => console.warn("[hermes/sucesso_aluno] enqueueTask:", e));

  await insertAdminInbox(
    "sucesso_aluno",
    "risco_churn",
    "Assinantes inativos detectados",
    descricao,
    withRecommendationPayload({ amostraUserIds: patterns.amostraAssinantesEmRisco }, recommendation),
  );

  for (const userId of patterns.amostraAssinantesEmRisco.slice(0, 5)) {
    await persistAcaoProativa(
      "sucesso_aluno",
      "intervencao_usuario",
      `Plano de reengajamento sugerido para usuário inativo (${patterns.periodoDias}d sem estudo).`,
      withRecommendationPayload({
        userId,
        canal: "in_app",
        passos: ["notificação push", "email personalizado", "meta de 1 simulado"],
      }, {
        ...recommendation,
        targetSurface: `usuario/${userId}`,
        observedState: `Usuario ${userId} na amostra de assinantes em risco.`,
      }),
      userId,
    );
  }
}
