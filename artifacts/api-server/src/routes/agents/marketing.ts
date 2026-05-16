import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { hermesMemoriaInteracaoTable } from "@workspace/db/schema";
import { requireAuth } from "../../middlewares/requireAuth";
import { openrouter, OR } from "../../lib/aiClient";
import { requireAdmin } from "../../lib/hermes/requireAdmin";
import { fetchPlatformMetrics } from "../../lib/hermes/metrics";
import { withHermesRecommendationStandard } from "../../lib/hermes/recommendationStandard";

const router: IRouter = Router();

async function runMarketingLlm(
  userId: string,
  agentContext: string,
  systemExtra: string,
  userContent: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  const completion = await openrouter.chat.completions.create({
    model: OR.claude,
    messages: [
      {
        role: "system",
        content: withHermesRecommendationStandard([
          "Você é o agente de marketing do StudyAI (ENEM, vestibulares, concursos).",
          "Responda em português, estruturado, acionável.",
          systemExtra,
        ].join(" ")),
      },
      { role: "user", content: userContent },
    ],
    max_tokens: 1800,
    temperature: 0.5,
  });

  const resposta = completion.choices[0]?.message?.content?.trim() ?? "";
  await db.insert(hermesMemoriaInteracaoTable).values({
    userId,
    agentId: "marketing",
    contexto: agentContext,
    resposta,
    metadata,
  });
  return resposta;
}

router.post("/planejar-campanha", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    objetivo,
    canal = "multi",
    orcamento,
    periodoDias = 14,
  } = (req.body ?? {}) as {
    objetivo?: string;
    canal?: string;
    orcamento?: string;
    periodoDias?: number;
  };

  if (!objetivo || typeof objetivo !== "string" || !objetivo.trim()) {
    res.status(400).json({ erro: "Campo 'objetivo' obrigatório (string)" });
    return;
  }

  try {
    const metricas = await fetchPlatformMetrics(Math.min(90, Number(periodoDias) || 14));
    const userContent = [
      `Objetivo: ${objetivo.trim()}`,
      `Canal: ${canal}`,
      orcamento ? `Orçamento: ${orcamento}` : "",
      `Métricas atuais:\n${JSON.stringify(metricas, null, 2)}`,
      "",
      "Entregue: público-alvo, mensagem principal, cronograma semanal, KPIs e riscos.",
    ]
      .filter(Boolean)
      .join("\n");

    const resposta = await runMarketingLlm(
      userId,
      objetivo.trim(),
      "Produza um plano de campanha completo em markdown.",
      userContent,
      { canal, orcamento, metricas },
    );

    res.json({ ok: true, agent: "marketing", canal, resposta });
  } catch (err: any) {
    console.error("[hermes/marketing] /planejar-campanha error:", err);
    res.status(500).json({ erro: "Falha no agente de marketing", _debug: err?.message ?? String(err) });
  }
});

router.post("/criativos", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    briefing,
    formato = "feed",
    n = 3,
  } = (req.body ?? {}) as { briefing?: string; formato?: string; n?: number };

  if (!briefing || typeof briefing !== "string" || !briefing.trim()) {
    res.status(400).json({ erro: "Campo 'briefing' obrigatório (string)" });
    return;
  }

  const num = Math.max(1, Math.min(8, Number(n) || 3));

  try {
    const resposta = await runMarketingLlm(
      userId,
      briefing.trim(),
      `Gere ${num} ideias de criativo (${formato}). JSON: { criativos: [{ titulo, copy, cta, visual }] }`,
      `Briefing: ${briefing.trim()}\nFormato: ${formato}\nQuantidade: ${num}`,
      { formato, n: num },
    );

    let parsed: unknown = resposta;
    try {
      parsed = JSON.parse(resposta);
    } catch {
      /* markdown/text fallback */
    }

    res.json({ ok: true, agent: "marketing", formato, resultado: parsed });
  } catch (err: any) {
    console.error("[hermes/marketing] /criativos error:", err);
    res.status(500).json({ erro: "Falha ao gerar criativos", _debug: err?.message ?? String(err) });
  }
});

router.post("/analisar-resultados", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    campanha,
    resultados,
    periodoDias = 30,
  } = (req.body ?? {}) as {
    campanha?: string;
    resultados?: Record<string, unknown>;
    periodoDias?: number;
  };

  if (!campanha || typeof campanha !== "string" || !campanha.trim()) {
    res.status(400).json({ erro: "Campo 'campanha' obrigatório (string)" });
    return;
  }

  try {
    const metricas = await fetchPlatformMetrics(Math.min(90, Number(periodoDias) || 30));
    const userContent = [
      `Campanha: ${campanha.trim()}`,
      resultados ? `Resultados informados:\n${JSON.stringify(resultados, null, 2)}` : "",
      `Baseline plataforma:\n${JSON.stringify(metricas, null, 2)}`,
      "",
      "Analise performance, compare com baseline, liste wins/losses e próximos passos.",
    ]
      .filter(Boolean)
      .join("\n");

    const resposta = await runMarketingLlm(
      userId,
      campanha.trim(),
      "Análise crítica de resultados de campanha.",
      userContent,
      { resultados, metricas },
    );

    res.json({ ok: true, agent: "marketing", resposta, metricas });
  } catch (err: any) {
    console.error("[hermes/marketing] /analisar-resultados error:", err);
    res.status(500).json({ erro: "Falha na análise", _debug: err?.message ?? String(err) });
  }
});

export default router;
