import { openrouter, OR } from "../../aiClient";
import { fetchPlatformMetrics } from "../metrics";
import { analyzeContentDatabases } from "./knowledge-index";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";

export async function marketingDailyLearn(): Promise<void> {
  const [metricas, contentIndex] = await Promise.all([
    fetchPlatformMetrics(7),
    analyzeContentDatabases(),
  ]);
  const evidencia = {
    metricas,
    contentIndex,
    funil: {
      waitlist: metricas.waitlistPeriodo,
      cadastros: metricas.novosUsuariosPeriodo,
      assinantes: metricas.assinantesAtivos,
    },
    materiasEmAlta: contentIndex.keywordStats.topMaterias.slice(0, 5),
    lacunasConteudo: contentIndex.contentGaps,
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content:
          "Agente de marketing StudyAI. Identifique insight de campanha/canal com base no funil e nas matérias em alta ou lacunas de conteúdo. JSON: { descoberta: string, importancia: 1-5 }",
      },
      { role: "user", content: JSON.stringify(evidencia) },
    ],
    max_tokens: 400,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      descoberta: `Funil: ${metricas.waitlistPeriodo} waitlist → ${metricas.novosUsuariosPeriodo} cadastros no período.`,
      importancia: 2,
    };
  }

  await persistDescoberta(
    "marketing",
    parsed.descoberta?.trim() || "Insight de marketing gerado.",
    evidencia,
    parsed.importancia ?? 2,
  );
}

export async function marketingProactive(): Promise<void> {
  const metricas = await fetchPlatformMetrics(7);

  if (metricas.waitlistPeriodo < 1 && metricas.novosUsuariosPeriodo < 3) {
    return;
  }

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content:
          "Proponha UMA ação de campanha imediata (canal, mensagem, KPI). JSON: { tipo, descricao, payload: { canal, acao, kpi } }",
      },
      { role: "user", content: JSON.stringify(metricas) },
    ],
    max_tokens: 350,
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: {
    tipo?: string;
    descricao?: string;
    payload?: Record<string, unknown>;
  } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      tipo: "campanha",
      descricao: "Campanha de reengajamento para leads da waitlist com CTA para cadastro.",
      payload: { canal: "email" },
    };
  }

  const descricao = parsed.descricao?.trim() || "Ação de campanha sugerida.";
  await persistAcaoProativa("marketing", parsed.tipo ?? "campanha", descricao, parsed.payload);
  await insertAdminInbox("marketing", "campanha", "Campanha sugerida", descricao, parsed.payload);
}
