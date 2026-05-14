import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, hermesMemoriaInteracaoTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { openrouter, OR } from "../../lib/aiClient";

// NOTE Hermes: helper duplicado entre gestao.ts e crescimento.ts por enquanto.
// Quando surgir um terceiro agente admin extraímos para `lib/hermes/requireAdmin.ts`.
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  try {
    const [row] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);
    if (row?.role !== "admin") {
      res.status(403).json({ erro: "Acesso restrito a administradores" });
      return;
    }
    next();
  } catch (err: any) {
    console.error("[hermes/gestao] requireAdmin error:", err);
    res.status(500).json({ erro: "Erro ao verificar permissões", _debug: err?.message ?? String(err) });
  }
}

const router: IRouter = Router();

/**
 * POST /api/agents/gestao/query
 * Body: { question: string, periodoDias?: number }
 * Agrega métricas do banco e pede análise ao LLM. Persiste em
 * hermes_memoria_interacao para auditoria.
 */
router.post("/query", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { question, periodoDias = 7 } = (req.body ?? {}) as { question?: string; periodoDias?: number };

  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ erro: "Campo 'question' obrigatório (string)" });
    return;
  }

  const dias = Math.max(1, Math.min(90, Number(periodoDias) || 7));
  const sinceIso = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  try {
    const totalRes = await db.execute(sql`SELECT COUNT(*)::int AS total FROM users`);
    const totalUsuarios = Number((totalRes.rows as any[])[0]?.total ?? 0);

    const novosRes = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM users WHERE created_at >= ${sinceIso}`,
    );
    const novosUsuariosPeriodo = Number((novosRes.rows as any[])[0]?.total ?? 0);

    const ativosRes = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM users WHERE stripe_subscription_status IN ('active','trialing')`,
    );
    const assinantesAtivos = Number((ativosRes.rows as any[])[0]?.total ?? 0);

    const metricas = {
      periodoDias: dias,
      totalUsuarios,
      novosUsuariosPeriodo,
      assinantesAtivos,
    };

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
