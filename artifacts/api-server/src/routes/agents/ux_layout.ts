import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { hermesMemoriaInteracaoTable } from "@workspace/db/schema";
import { requireAuth } from "../../middlewares/requireAuth";
import { openrouter, OR } from "../../lib/aiClient";
import { UX_LAYOUT_LENS_PT } from "../../lib/hermes/buildHermesContext";
import { requireAdmin } from "../../lib/hermes/requireAdmin";
import { withHermesRecommendationStandard } from "../../lib/hermes/recommendationStandard";

const router: IRouter = Router();

/**
 * POST /api/agents/ux_layout/revisar-tela
 * Body: { screenDescription: string, goal?: string }
 */
router.post("/revisar-tela", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { screenDescription, goal } = (req.body ?? {}) as {
    screenDescription?: string;
    goal?: string;
  };

  if (!screenDescription || typeof screenDescription !== "string" || !screenDescription.trim()) {
    res.status(400).json({ erro: "Campo 'screenDescription' obrigatório (string)" });
    return;
  }

  const goalText =
    goal && typeof goal === "string" && goal.trim()
      ? goal.trim()
      : "Melhorar conversão e clareza para estudantes ENEM/vestibular";

  try {
    const completion = await openrouter.chat.completions.create({
      model: OR.claudeFast,
      messages: [
        {
          role: "system",
          content: withHermesRecommendationStandard([
            "Você é o agente ux_layout do StudyAI.",
            UX_LAYOUT_LENS_PT,
            "Retorne JSON estrito:",
            "{ hierarquia: string[], ctas: { primario?: string, secundario?: string, notas: string }, clareza: string[], microcopy: string[], prioridade: 'alta'|'media'|'baixa', recommendation }",
          ].join(" ")),
        },
        {
          role: "user",
          content: `Objetivo: ${goalText}\n\nTela:\n${screenDescription.trim()}`,
        },
      ],
      max_tokens: 900,
      temperature: 0.35,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let sugestoes: Record<string, unknown>;
    try {
      sugestoes = JSON.parse(raw);
    } catch {
      sugestoes = { _raw: raw, _parseError: true };
    }

    await db.insert(hermesMemoriaInteracaoTable).values({
      userId,
      agentId: "ux_layout",
      contexto: screenDescription.trim().slice(0, 500),
      resposta: raw,
      metadata: { goal: goalText },
    });

    res.json({ ok: true, agent: "ux_layout", goal: goalText, sugestoes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hermes/ux_layout] /revisar-tela error:", err);
    res.status(500).json({ erro: "Falha na revisão de tela", _debug: message });
  }
});

export default router;
