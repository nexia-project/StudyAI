import { openrouter, OR } from "../../aiClient";
import { fetchPlatformMetrics } from "../metrics";
import { countKnowledgeDocuments } from "./knowledge-index";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";

export async function gestaoDailyLearn(): Promise<void> {
  const metricas = await fetchPlatformMetrics(7);
  const knowledgeDocCount = await countKnowledgeDocuments();
  console.info("[gestao/daily-learn] knowledge_documents:", knowledgeDocCount);

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content:
          "Você é o agente de gestão do StudyAI. Sintetize UMA descoberta acionável sobre a operação da plataforma com base nos dados. Responda JSON: { descoberta: string, importancia: 1-5 }",
      },
      { role: "user", content: JSON.stringify(metricas) },
    ],
    max_tokens: 400,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { descoberta: raw.slice(0, 500), importancia: 2 };
  }

  const descoberta =
    parsed.descoberta?.trim() ||
    `Período ${metricas.periodoDias}d: ${metricas.novosUsuariosPeriodo} novos usuários, ${metricas.assinantesAtivos} assinantes ativos.`;

  await persistDescoberta(
    "gestao",
    descoberta,
    { metricas, knowledgeDocCount },
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
  await persistAcaoProativa("gestao", "anomalia_metrica", descricao, { metricas, anomalies });
  await insertAdminInbox(
    "gestao",
    "anomalia",
    "Anomalia operacional detectada",
    descricao,
    { metricas },
  );
}
