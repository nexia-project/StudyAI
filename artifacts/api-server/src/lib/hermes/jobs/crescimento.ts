import { openrouter, OR } from "../../aiClient";
import { fetchPlatformMetrics } from "../metrics";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";
import {
  formatHermesRecommendation,
  normalizeHermesRecommendation,
  withHermesRecommendationStandard,
  withRecommendationPayload,
  type HermesRecommendation,
} from "../recommendationStandard";

export async function crescimentoDailyLearn(): Promise<void> {
  const metricas = await fetchPlatformMetrics(14);
  const taxaConversao =
    metricas.totalUsuarios > 0
      ? metricas.assinantesAtivos / metricas.totalUsuarios
      : 0;
  const taxaWaitlist =
    metricas.waitlistTotal > 0
      ? metricas.waitlistPeriodo / Math.max(1, metricas.waitlistTotal)
      : 0;

  const evidencia = {
    metricas,
    taxaConversaoAssinatura: taxaConversao,
    waitlistNovosPeriodo: metricas.waitlistPeriodo,
    taxaCrescimentoWaitlist: taxaWaitlist,
  };
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "crescimento",
    area: "growth",
    targetSurface: "funil/cadastros-waitlist-assinaturas",
    observedState: `Conversao assinatura ${(taxaConversao * 100).toFixed(1)}%; waitlist +${metricas.waitlistPeriodo} no periodo.`,
    evidence: JSON.stringify(evidencia),
    problemOpportunity: "Avaliar se o funil precisa de teste de aquisicao ou conversao mais especifico.",
    recommendedChange: "Gerar um experimento de growth ligado ao ponto mais fraco observado nos dados.",
    expectedImpact: "Aumentar cadastro qualificado ou conversao para assinatura.",
    confidence: "media",
    successMetric: "Taxa de cadastro, taxa de assinatura ativa e conversao do teste A/B.",
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Agente de crescimento StudyAI. Analise tendências de cadastro, waitlist e conversão. JSON: { descoberta: string, importancia: 1-5, recommendation }",
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
      descoberta: `Conversão ~${(taxaConversao * 100).toFixed(1)}%; waitlist +${metricas.waitlistPeriodo} no período.`,
      importancia: 2,
    };
  }
  const recommendation = normalizeHermesRecommendation(parsed.recommendation, fallbackRecommendation);

  await persistDescoberta(
    "crescimento",
    parsed.descoberta?.trim() || formatHermesRecommendation(recommendation),
    { ...evidencia, recommendation },
    parsed.importancia ?? 2,
  );
}

export async function crescimentoProactive(): Promise<void> {
  const metricas = await fetchPlatformMetrics(7);
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "crescimento",
    area: "growth",
    targetSurface: "landing/copy",
    observedState: `Ultimos 7 dias: ${metricas.novosUsuariosPeriodo} novos usuarios, ${metricas.waitlistPeriodo} entradas na waitlist.`,
    evidence: JSON.stringify(metricas),
    problemOpportunity: "A copy da landing pode ser testada com uma hipotese mensuravel.",
    recommendedChange: "Rodar um teste A/B com duas headlines e uma metrica alvo definida.",
    expectedImpact: "Encontrar uma mensagem com maior conversao para cadastro.",
    confidence: "media",
    successMetric: "CTR do CTA e taxa de cadastro por variante.",
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Sugira UM teste A/B de copy para StudyAI (ENEM/vestibulares). JSON: { tipo: string, descricao: string, payload: { headlineA, headlineB, metrica }, recommendation }",
        ),
      },
      { role: "user", content: JSON.stringify(metricas) },
    ],
    max_tokens: 350,
    temperature: 0.6,
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
      tipo: "teste_copy",
      descricao: "Testar headline focada em nota ENEM vs. tempo de estudo economizado.",
      payload: { canal: "landing" },
    };
  }

  const descricao =
    parsed.descricao?.trim() || "Sugestão de teste A/B de copy na landing.";
  const recommendation = normalizeHermesRecommendation(parsed.recommendation, {
    ...fallbackRecommendation,
    recommendedChange: descricao,
    successMetric:
      typeof parsed.payload?.metrica === "string" ? parsed.payload.metrica : fallbackRecommendation.successMetric,
  });
  const payload = withRecommendationPayload(parsed.payload, recommendation);
  await persistAcaoProativa(
    "crescimento",
    parsed.tipo ?? "teste_copy",
    descricao,
    payload,
  );
  await insertAdminInbox(
    "crescimento",
    "teste_copy",
    "Sugestão de teste A/B",
    descricao,
    payload,
  );
}
