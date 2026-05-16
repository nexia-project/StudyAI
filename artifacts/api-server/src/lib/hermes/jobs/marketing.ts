import { openrouter, OR } from "../../aiClient";
import { fetchPlatformMetrics } from "../metrics";
import { analyzeContentDatabases } from "./knowledge-index";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";
import {
  formatHermesRecommendation,
  normalizeHermesRecommendation,
  withHermesRecommendationStandard,
  withRecommendationPayload,
  type HermesRecommendation,
} from "../recommendationStandard";

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
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "marketing",
    area: "marketing",
    targetSurface: "campanhas/funil",
    observedState: `Funil no periodo: ${metricas.waitlistPeriodo} waitlist, ${metricas.novosUsuariosPeriodo} cadastros, ${metricas.assinantesAtivos} assinantes ativos.`,
    evidence: JSON.stringify({
      funil: evidencia.funil,
      materiasEmAlta: evidencia.materiasEmAlta,
      lacunasConteudo: evidencia.lacunasConteudo,
    }),
    problemOpportunity: "Transformar sinais de funil e conteudo em uma campanha mensuravel.",
    recommendedChange: "Propor uma acao de campanha ligada a canal, mensagem e KPI especificos.",
    expectedImpact: "Aumentar aquisicao ou reativacao com base em demanda observada.",
    confidence: "media",
    successMetric: "Cadastros, CTR da campanha e conversao para assinatura.",
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Agente de marketing StudyAI. Identifique insight de campanha/canal com base no funil e nas matérias em alta ou lacunas de conteúdo. JSON: { descoberta: string, importancia: 1-5, recommendation }",
        ),
      },
      { role: "user", content: JSON.stringify(evidencia) },
    ],
    max_tokens: 400,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number; recommendation?: unknown } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      descoberta: `Funil: ${metricas.waitlistPeriodo} waitlist → ${metricas.novosUsuariosPeriodo} cadastros no período.`,
      importancia: 2,
    };
  }
  const recommendation = normalizeHermesRecommendation(parsed.recommendation, fallbackRecommendation);

  await persistDescoberta(
    "marketing",
    parsed.descoberta?.trim() || formatHermesRecommendation(recommendation),
    { ...evidencia, recommendation },
    parsed.importancia ?? 2,
  );
}

export async function marketingProactive(): Promise<void> {
  const metricas = await fetchPlatformMetrics(7);
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "marketing",
    area: "marketing",
    targetSurface: "campanha/imediata",
    observedState: `Ultimos 7 dias: ${metricas.waitlistPeriodo} waitlist e ${metricas.novosUsuariosPeriodo} novos usuarios.`,
    evidence: JSON.stringify(metricas),
    problemOpportunity: "Ha sinal recente suficiente para uma acao de campanha se houver volume no funil.",
    recommendedChange: "Definir uma campanha imediata com canal, mensagem, acao e KPI.",
    expectedImpact: "Converter interesse recente em cadastro ou ativacao.",
    confidence: "media",
    successMetric: "CTR, cadastros atribuidos e conversao por canal.",
  };

  if (metricas.waitlistPeriodo < 1 && metricas.novosUsuariosPeriodo < 3) {
    return;
  }

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Proponha UMA ação de campanha imediata (canal, mensagem, KPI). JSON: { tipo, descricao, payload: { canal, acao, kpi }, recommendation }",
        ),
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
    recommendation?: unknown;
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
  const recommendation = normalizeHermesRecommendation(parsed.recommendation, {
    ...fallbackRecommendation,
    recommendedChange: descricao,
    successMetric:
      typeof parsed.payload?.kpi === "string" ? parsed.payload.kpi : fallbackRecommendation.successMetric,
  });
  const payload = withRecommendationPayload(parsed.payload, recommendation);
  await persistAcaoProativa("marketing", parsed.tipo ?? "campanha", descricao, payload);
  await insertAdminInbox("marketing", "campanha", "Campanha sugerida", descricao, payload);

  const { enqueueTask } = await import("../tasks/queue");
  await enqueueTask("marketing", "copy", {
    source: "hourly_proactive",
    descricao,
    tipoAcao: parsed.tipo ?? "campanha",
    payload,
  }).catch((e) => console.warn("[hermes/marketing] enqueueTask:", e));
}
