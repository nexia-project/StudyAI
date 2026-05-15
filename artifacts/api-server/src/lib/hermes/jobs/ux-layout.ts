import { openrouter, OR } from "../../aiClient";
import { LANDING_AUDIT, landingAuditSummary } from "../landing-audit";
import { insertAdminInbox, persistAcaoProativa, persistDescoberta } from "../persist";

export async function uxLayoutDailyLearn(): Promise<void> {
  const auditBlob = landingAuditSummary();

  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content:
          "Agente ux_layout do StudyAI. Analise a ESTRUTURA de copy da landing (hierarquia, CTAs, densidade de features, clareza). Não invente métricas. JSON: { descoberta: string, importancia: 1-5, secaoFoco?: string }",
      },
      { role: "user", content: auditBlob },
    ],
    max_tokens: 450,
    temperature: 0.25,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: { descoberta?: string; importancia?: number; secaoFoco?: string } = {};
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

  await persistDescoberta(
    "ux_layout",
    parsed.descoberta?.trim() || "Auditoria de estrutura da landing concluída.",
    { kind: "landing", audit: LANDING_AUDIT, secaoFoco: parsed.secaoFoco },
    parsed.importancia ?? 2,
  );
}

type ProactiveAction = {
  tipo: string;
  descricao: string;
  payload?: Record<string, unknown>;
};

export async function uxLayoutProactive(): Promise<void> {
  const completion = await openrouter.chat.completions.create({
    model: OR.claudeFast,
    messages: [
      {
        role: "system",
        content: `Agente ux_layout StudyAI. Com base no snapshot da landing, sugira 0 a 2 ações proativas de layout/microcopy SOMENTE se houver problema claro (CTA competindo, headline confuso, grid longo). Se estiver ok, retorne acoes: []. JSON: { acoes: [{ tipo: string, descricao: string, payload: { secao, sugestao } }] }`,
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
    const descricao = acao.descricao?.trim();
    if (!descricao) continue;
    await persistAcaoProativa(
      "ux_layout",
      acao.tipo ?? "microcopy",
      descricao,
      acao.payload ?? { secao: "landing" },
    );
    await insertAdminInbox(
      "ux_layout",
      acao.tipo ?? "layout",
      "Sugestão UX landing",
      descricao,
      acao.payload,
    );
  }
}
