import { openrouter, OR } from "../../aiClient";
import { LANDING_AUDIT, landingAuditSummary } from "../landing-audit";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";
import {
  formatHermesRecommendation,
  normalizeHermesRecommendation,
  withHermesRecommendationStandard,
  withRecommendationPayload,
  type HermesRecommendation,
} from "../recommendationStandard";

export async function uxLayoutDailyLearn(): Promise<void> {
  const auditBlob = landingAuditSummary();

  const fallbackRecommendation: HermesRecommendation = {
    agentId: "ux_layout",
    area: "UX/layout",
    targetSurface: "artifacts/studyai/src/pages/Landing.tsx",
    observedState: "Snapshot estatico da landing analisado pelo Hermes.",
    evidence: "LANDING_AUDIT com hero, CTAs, grid de features, pricing e CTA final.",
    problemOpportunity: "Identificar friccao de hierarquia, clareza ou microcopy antes de alterar a landing.",
    recommendedChange: "Priorizar uma melhoria especifica na secao com maior risco de confusao.",
    expectedImpact: "Aumentar clareza da proposta de valor e taxa de clique no CTA principal.",
    confidence: "media",
    successMetric: "CTR do CTA primario e conversao landing -> cadastro.",
    implementationNotes: "Aplicar em Landing.tsx e validar com evento studyia_landing_cta por variante.",
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          "Agente ux_layout do StudyAI. Analise a ESTRUTURA de copy da landing (hierarquia, CTAs, densidade de features, clareza). Não invente métricas. JSON: { descoberta: string, importancia: 1-5, secaoFoco?: string, recommendation }",
        ),
      },
      { role: "user", content: auditBlob },
    ],
    max_tokens: 450,
    temperature: 0.25,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: {
    descoberta?: string;
    importancia?: number;
    secaoFoco?: string;
    recommendation?: unknown;
  } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      descoberta:
        "Hero com múltiplos CTAs e h1 denso; revisar hierarquia headline → benefício → CTA único.",
      importancia: 2,
      secaoFoco: "hero",
    };
  }
  const recommendation = normalizeHermesRecommendation(parsed.recommendation, fallbackRecommendation);

  await persistDescoberta(
    "ux_layout",
    parsed.descoberta?.trim() || formatHermesRecommendation(recommendation),
    { kind: "landing", audit: LANDING_AUDIT, secaoFoco: parsed.secaoFoco, recommendation },
    parsed.importancia ?? 2,
  );
}

type ProactiveAction = {
  tipo: string;
  descricao: string;
  payload?: Record<string, unknown>;
  recommendation?: unknown;
};

export async function uxLayoutProactive(): Promise<void> {
  const fallbackRecommendation: HermesRecommendation = {
    agentId: "ux_layout",
    area: "UX/layout",
    targetSurface: "landing",
    observedState: "Snapshot estatico da landing disponivel para auditoria.",
    evidence: "LANDING_AUDIT.sections e uxNotes.",
    problemOpportunity: "Alguma secao pode estar competindo por atencao ou ficando pouco escaneavel.",
    recommendedChange: "Sugerir uma alteracao concreta de layout ou microcopy em uma secao identificada.",
    expectedImpact: "Melhorar compreensao e clique no CTA principal.",
    confidence: "media",
    successMetric: "CTR do CTA primario, scroll depth e cadastro iniciado.",
  };

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard(
          `Agente ux_layout StudyAI. Com base no snapshot da landing, sugira 0 a 2 ações proativas de layout/microcopy SOMENTE se houver problema claro (CTA competindo, headline confuso, grid longo). Se estiver ok, retorne acoes: []. JSON: { acoes: [{ tipo: string, descricao: string, payload: { secao, sugestao }, recommendation }] }`,
        ),
      },
      { role: "user", content: landingAuditSummary() },
    ],
    max_tokens: 500,
    temperature: 0.35,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let acoes: ProactiveAction[] = [];
  try {
    const parsed = JSON.parse(raw) as { acoes?: ProactiveAction[] };
    acoes = Array.isArray(parsed.acoes) ? parsed.acoes.slice(0, 2) : [];
  } catch {
    acoes = [];
  }

  if (acoes.length === 0) return;

  for (const acao of acoes) {
    const recommendation = normalizeHermesRecommendation(acao.recommendation, {
      ...fallbackRecommendation,
      targetSurface: typeof acao.payload?.secao === "string" ? `landing/${acao.payload.secao}` : "landing",
      recommendedChange:
        typeof acao.payload?.sugestao === "string"
          ? acao.payload.sugestao
          : fallbackRecommendation.recommendedChange,
    });
    const descricao = acao.descricao?.trim() || formatHermesRecommendation(recommendation);
    if (!descricao) continue;
    const payload = withRecommendationPayload(acao.payload ?? { secao: "landing" }, recommendation);
    await persistAcaoProativa(
      "ux_layout",
      acao.tipo ?? "microcopy",
      descricao,
      payload,
    );
    await insertAdminInbox(
      "ux_layout",
      acao.tipo ?? "layout",
      "Sugestão UX landing",
      descricao,
      payload,
    );
  }
}
