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
  const riskSignals = patterns.studentSuccessSignals.filter((signal) => signal.status === "risk");
  const missingSignals = patterns.studentSuccessSignals.filter((signal) => signal.status === "missing_signal");
  const primarySignal = riskSignals[0] ?? missingSignals[0] ?? patterns.studentSuccessSignals[0];
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "sucesso_aluno",
    area: "aluno/success",
    module: "Home",
    targetSurface: "Home next-best-action, Simulado, Caderno de Erros, Tiagao",
    observedState:
      primarySignal?.observed ??
      `${patterns.assinantesSemEstudo} assinante(s) sem estudo nos ultimos ${patterns.periodoDias}d; ${patterns.usuariosSemAtividadeNunca} usuarios nunca registraram atividade.`,
    evidence: JSON.stringify({
      periodoDias: patterns.periodoDias,
      totalUsuarios: patterns.totalUsuarios,
      assinantesAtivos: patterns.assinantesAtivos,
      signals: patterns.studentSuccessSignals,
      recommendations: patterns.studentSuccessRecommendations,
    }),
    problemOpportunity:
      riskSignals.length > 0
        ? "Sinais de aprendizagem travada podem virar churn se a proxima missao nao for clara e praticavel."
        : "Mesmo sem risco forte, Student Success precisa monitorar missao, pratica e revisao de forma continua.",
    recommendedChange:
      patterns.studentSuccessRecommendations[0]?.action ??
      "Manter monitoramento semanal e melhorar instrumentacao de missao, pratica e revisao quando faltarem sinais.",
    expectedImpact: "Aumentar retorno ao estudo, pratica guiada e conclusao de revisoes/simulados.",
    confidence: riskSignals.length > 0 ? "alta" : missingSignals.length > 0 ? "media" : "media",
    successMetric:
      patterns.studentSuccessRecommendations[0]?.metric ??
      "Usuarios reativados em 7 dias, sessoes de estudo, praticas concluidas e retencao.",
    implementationNotes:
      "Nao envia mensagem real nem altera plano do aluno automaticamente; gera recomendacao auditavel para Admin/Hermes.",
    acceptanceCriteria: [
      "Cada risco tem sinal, acao, metrica e amostra sem PII sensivel",
      "Abandono, erros repetidos, chat sem pratica e falta de missao viram triagem, nao mutacao automatica",
      "Admin consegue ver recomendacao estruturada no payload Hermes",
    ],
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Agente sucesso_aluno (Student Success) do StudyAI. Analise sinais de aluno travado: sem estudo, erros repetidos, simulado abandonado, chat sem pratica e ausencia de proxima missao. JSON: { descoberta: string, importancia: 1-5, recommendation }",
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
    {
      kind: "student_success_patterns",
      patterns,
      riskSignals,
      missingSignals,
      structuredRecommendations: patterns.studentSuccessRecommendations,
      recommendation,
    },
    parsed.importancia ?? (riskSignals.length > 0 ? 4 : 2),
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
  const riskSignals = patterns.studentSuccessSignals.filter((signal) => signal.status === "risk");
  const primaryAction =
    patterns.studentSuccessRecommendations[0]?.action ??
    "Disparar plano de reengajamento com email, in-app e oferta de sessao guiada.";

  if (patterns.assinantesAtivos < 1) return;
  if (patterns.assinantesSemEstudo < 1 && riskSignals.length < 1) return;

  const taxa =
    patterns.assinantesAtivos > 0
      ? patterns.assinantesSemEstudo / patterns.assinantesAtivos
      : 0;

  if (taxa < 0.15 && patterns.assinantesSemEstudo < 2 && riskSignals.length < 2) return;

  const descricao = `${patterns.assinantesSemEstudo} de ${patterns.assinantesAtivos} assinante(s) sem atividade de estudo nos últimos ${patterns.periodoDias} dias (${(taxa * 100).toFixed(0)}%); ${riskSignals.length} sinal(is) Student Success em risco.`;
  const recommendation: HermesRecommendation = {
    agentId: "sucesso_aluno",
    area: "aluno/success",
    module: "Home",
    targetSurface: "Home next-best-action, Simulado, Caderno de Erros, Tiagao",
    observedState: descricao,
    evidence: JSON.stringify({
      assinantesSemEstudo: patterns.assinantesSemEstudo,
      assinantesAtivos: patterns.assinantesAtivos,
      periodoDias: patterns.periodoDias,
      amostra: patterns.amostraAssinantesEmRisco,
      signals: patterns.studentSuccessSignals,
    }),
    problemOpportunity:
      "Parcela relevante de assinantes ativos ou alunos com sinais de aprendizagem travada precisa de proxima missao clara.",
    recommendedChange: primaryAction,
    expectedImpact: "Aumentar retomada de estudo, pratica guiada e fechamento de loops de revisao.",
    confidence: "alta",
    successMetric:
      patterns.studentSuccessRecommendations[0]?.metric ??
      "Percentual da amostra com atividade de estudo em ate 7 dias.",
    implementationNotes: "Gerar mensagens pela fila Hermes antes de qualquer envio real ou mudanca no plano do aluno.",
    acceptanceCriteria: [
      "Risco aparece com sinal, acao e metrica no Admin/Hermes",
      "Mensagem personalizada fica apenas na fila ate revisao/aprovacao",
      "Reativacao e pratica sao medidas em ate 7 dias",
    ],
  };

  const payload = withRecommendationPayload({
    patterns,
    riskSignals,
    sugestoes: patterns.studentSuccessRecommendations.map((item) => ({
      acao: item.action,
      metrica: item.metric,
      prioridade: item.priority,
    })),
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
