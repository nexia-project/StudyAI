import { openrouter, OR } from "../../aiClient";
import { fetchInactiveUserPatterns } from "../retention-metrics";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";

export async function sucessoAlunoDailyLearn(): Promise<void> {
  const patterns = await fetchInactiveUserPatterns(14);

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content:
          "Agente sucesso_aluno (retenção/CS) do StudyAI. Analise padrões de inatividade e risco de churn. JSON: { descoberta: string, importancia: 1-5 }",
      },
      { role: "user", content: JSON.stringify(patterns) },
    ],
    max_tokens: 450,
    temperature: 0.25,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      descoberta: `${patterns.assinantesSemEstudo} assinante(s) sem estudo nos últimos ${patterns.periodoDias}d; ${patterns.usuariosSemAtividadeNunca} nunca registraram atividade.`,
      importancia: patterns.assinantesSemEstudo > 0 ? 3 : 2,
    };
  }

  await persistDescoberta(
    "sucesso_aluno",
    parsed.descoberta?.trim() || "Análise de retenção concluída.",
    { kind: "retention_patterns", patterns },
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

  await persistAcaoProativa("sucesso_aluno", "risco_churn", descricao, {
    patterns,
    sugestoes: [
      { acao: "email_reengajamento", prioridade: "alta" },
      { acao: "oferta_sessao_guiada", prioridade: "media" },
      { acao: "revisar_onboarding", prioridade: "baixa" },
    ],
  });

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
    { amostraUserIds: patterns.amostraAssinantesEmRisco },
  );

  for (const userId of patterns.amostraAssinantesEmRisco.slice(0, 5)) {
    await persistAcaoProativa(
      "sucesso_aluno",
      "intervencao_usuario",
      `Plano de reengajamento sugerido para usuário inativo (${patterns.periodoDias}d sem estudo).`,
      {
        userId,
        canal: "in_app",
        passos: ["notificação push", "email personalizado", "meta de 1 simulado"],
      },
      userId,
    );
  }
}
