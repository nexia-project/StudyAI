import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { hermesMemoriaInteracaoTable } from "@workspace/db/schema";
import { requireAuth } from "../../middlewares/requireAuth";
import { openrouter, OR } from "../../lib/aiClient";
import { requireAdmin } from "../../lib/hermes/requireAdmin";
import { fetchPlatformMetrics } from "../../lib/hermes/metrics";

const router: IRouter = Router();

/**
 * POST /api/agents/gestao/query
 * Body: { question: string, periodoDias?: number }
 */
router.post("/query", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { question, periodoDias = 7 } = (req.body ?? {}) as { question?: string; periodoDias?: number };

  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ erro: "Campo 'question' obrigatório (string)" });
    return;
  }

  const dias = Math.max(1, Math.min(90, Number(periodoDias) || 7));

  try {
    const metricas = await fetchPlatformMetrics(dias);

    const systemPrompt = [
      "Você é o agente de gestão do StudyAI — copiloto analítico do founder.",
      "Responda em português, objetivo, com bullets curtos.",
      "Use exclusivamente os dados fornecidos. Quando faltar dado, diga 'sem dado'.",
      "Termine com 1-3 recomendações acionáveis.",
    ].join(" ");

    const userPrompt = [
      `Métricas (últimos ${dias} dia(s)):`,
      JSON.stringify(metricas, null, 2),
      "",
      `Pergunta do founder: ${question.trim()}`,
    ].join("\n");

    const completion = await openrouter.chat.completions.create({
      model: OR.claude,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const resposta = completion.choices[0]?.message?.content?.trim() ?? "";

    await db.insert(hermesMemoriaInteracaoTable).values({
      userId,
      agentId: "gestao",
      contexto: question.trim(),
      resposta,
      metadata: { metricas },
    });

    res.json({ ok: true, agent: "gestao", metricas, resposta });
  } catch (err: any) {
    console.error("[hermes/gestao] /query error:", err);
    res.status(500).json({ erro: "Falha no agente de gestão", _debug: err?.message ?? String(err) });
  }
});

export default router;
