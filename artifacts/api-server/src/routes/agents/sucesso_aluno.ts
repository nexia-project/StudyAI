import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { hermesMemoriaInteracaoTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { openrouter, OR } from "../../lib/aiClient";
import { requireAdmin } from "../../lib/hermes/requireAdmin";
import { fetchInactiveUserPatterns } from "../../lib/hermes/retention-metrics";
import { withHermesRecommendationStandard } from "../../lib/hermes/recommendationStandard";

const router: IRouter = Router();

async function persistSucessoMemoria(
  userId: string,
  contexto: string,
  resposta: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await db.insert(hermesMemoriaInteracaoTable).values({
    userId,
    agentId: "sucesso_aluno",
    contexto,
    resposta,
    metadata,
  });
}

router.post("/analisar-risco", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const adminUserId = req.userId!;
  const {
    userId: alvoUserId,
    periodoDias = 14,
    pergunta,
  } = (req.body ?? {}) as {
    userId?: string;
    periodoDias?: number;
    pergunta?: string;
  };

  const dias = Math.max(1, Math.min(90, Number(periodoDias) || 14));
  const sinceIso = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  try {
    const patterns = await fetchInactiveUserPatterns(dias);
    let alvo: Record<string, unknown> | null = null;

    if (alvoUserId && typeof alvoUserId === "string") {
      const userRes = await db.execute(sql`
        SELECT
          u.id,
          u.email,
          u.stripe_subscription_status,
          u.created_at,
          (SELECT COUNT(*)::int FROM user_activity ua WHERE ua.user_id = u.id) AS total_atividades,
          (SELECT MAX(ua.created_at) FROM user_activity ua WHERE ua.user_id = u.id) AS ultima_atividade
        FROM users u
        WHERE u.id = ${alvoUserId}
        LIMIT 1
      `);
      const row = userRes.rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        res.status(404).json({ erro: "Usuário não encontrado" });
        return;
      }
      const atividadePeriodo = await db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM user_activity
        WHERE user_id = ${alvoUserId} AND created_at >= ${sinceIso}
      `);
      alvo = {
        ...row,
        atividadeNoPeriodo: Number((atividadePeriodo.rows[0] as { count?: number })?.count ?? 0),
        periodoDias: dias,
      };
    }

    const systemPrompt = withHermesRecommendationStandard([
      "Você é o agente sucesso_aluno do StudyAI — retenção e customer success.",
      "Analise risco de churn com base nos dados JSON. Responda em português, bullets curtos.",
      "Inclua: nível de risco (baixo/médio/alto), sinais observados, hipóteses, recomendação, ação segura e métrica.",
      "Considere explicitamente sinais de aluno travado: sem dias de estudo, erros repetidos, simulado abandonado, muito chat sem prática e ausência de próxima missão.",
    ].join(" "));

    const userPrompt = [
      pergunta?.trim() ? `Pergunta do admin: ${pergunta.trim()}` : "",
      alvo ? `Usuário alvo:\n${JSON.stringify(alvo, null, 2)}` : "",
      `Padrões da base:\n${JSON.stringify(patterns, null, 2)}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const completion = await openrouter.chat.completions.create({
      model: OR.claude,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1600,
      temperature: 0.35,
    });

    const resposta = completion.choices[0]?.message?.content?.trim() ?? "";
    const contexto = alvoUserId
      ? `analisar-risco:${alvoUserId}`
      : `analisar-risco:cohort:${dias}d`;

    await persistSucessoMemoria(adminUserId, contexto, resposta, { patterns, alvo, periodoDias: dias });

    res.json({
      ok: true,
      agent: "sucesso_aluno",
      periodoDias: dias,
      alvoUserId: alvoUserId ?? null,
      patterns,
      studentSuccessSignals: patterns.studentSuccessSignals,
      structuredRecommendations: patterns.studentSuccessRecommendations,
      resposta,
    });
  } catch (err: any) {
    console.error("[hermes/sucesso_aluno] /analisar-risco error:", err);
    res.status(500).json({ erro: "Falha na análise de risco", _debug: err?.message ?? String(err) });
  }
});

router.post("/plano-intervencao", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const adminUserId = req.userId!;
  const {
    userId: alvoUserId,
    segmento,
    contextoRisco,
    canais = ["email", "in_app"],
  } = (req.body ?? {}) as {
    userId?: string;
    segmento?: string;
    contextoRisco?: string;
    canais?: string[];
  };

  if (!alvoUserId && !segmento?.trim() && !contextoRisco?.trim()) {
    res.status(400).json({
      erro: "Informe userId, segmento ou contextoRisco para gerar o plano",
    });
    return;
  }

  try {
    const patterns = await fetchInactiveUserPatterns(14);
    const userPrompt = [
      alvoUserId ? `userId: ${alvoUserId}` : "",
      segmento?.trim() ? `segmento: ${segmento.trim()}` : "",
      contextoRisco?.trim() ? `contexto: ${contextoRisco.trim()}` : "",
      `canais preferidos: ${(canais ?? []).join(", ")}`,
      `padrões plataforma:\n${JSON.stringify(patterns, null, 2)}`,
      "",
      "Entregue plano em markdown: objetivo, timing (D0/D3/D7), mensagens por canal, métrica de sucesso, escalonamento humano se necessário.",
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openrouter.chat.completions.create({
      model: OR.claude,
      messages: [
        {
          role: "system",
          content: withHermesRecommendationStandard(
            "Agente sucesso_aluno StudyAI. Plano de intervenção de retenção acionável, sem executar envios — só estrutura para o time.",
          ),
        },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1800,
      temperature: 0.4,
    });

    const resposta = completion.choices[0]?.message?.content?.trim() ?? "";
    const contexto = alvoUserId
      ? `plano-intervencao:${alvoUserId}`
      : `plano-intervencao:${segmento?.trim() ?? "cohort"}`;

    await persistSucessoMemoria(adminUserId, contexto, resposta, {
      alvoUserId,
      segmento,
      contextoRisco,
      canais,
      patterns,
    });

    res.json({
      ok: true,
      agent: "sucesso_aluno",
      alvoUserId: alvoUserId ?? null,
      resposta,
    });
  } catch (err: any) {
    console.error("[hermes/sucesso_aluno] /plano-intervencao error:", err);
    res.status(500).json({ erro: "Falha ao gerar plano", _debug: err?.message ?? String(err) });
  }
});

export default router;
