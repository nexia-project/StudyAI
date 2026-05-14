import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, hermesMemoriaInteracaoTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { openrouter, OR } from "../../lib/aiClient";

// NOTE Hermes: helper duplicado vs gestao.ts intencionalmente. Quando houver um
// terceiro agente admin movemos para `lib/hermes/requireAdmin.ts`.
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
    console.error("[hermes/crescimento] requireAdmin error:", err);
    res.status(500).json({ erro: "Erro ao verificar permissões", _debug: err?.message ?? String(err) });
  }
}

const router: IRouter = Router();

/**
 * POST /api/agents/crescimento/gerar-copy
 * Body: { briefing: string, canal?: string, publico?: string, n?: number }
 * Gera N variações de copy + hipótese de teste A/B. Persiste a interação em
 * hermes_memoria_interacao.
 */
router.post("/gerar-copy", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    briefing,
    canal = "landing",
    publico = "estudantes ENEM",
    n = 3,
  } = (req.body ?? {}) as {
    briefing?: string;
    canal?: string;
    publico?: string;
    n?: number;
  };

  if (!briefing || typeof briefing !== "string" || !briefing.trim()) {
    res.status(400).json({ erro: "Campo 'briefing' obrigatório (string)" });
    return;
  }
  const numVariacoes = Math.max(2, Math.min(6, Number(n) || 3));

  try {
    const systemPrompt = [
      "Você é o agente de crescimento do StudyAI (plataforma de estudos com IA — ENEM, vestibulares, concursos).",
      "Gere copy de marketing em português, tom autêntico, sem clichês ('transforme sua vida' etc.).",
      "Retorne JSON estrito, sem markdown, no formato:",
      "{ variacoes: [{ headline: string, sub: string, cta: string }], hipoteseTesteAB: string, metricaAlvo: string }",
    ].join(" ");

    const userPrompt = [
      `Briefing: ${briefing.trim()}`,
      `Canal: ${canal}`,
      `Público-alvo: ${publico}`,
      `Gere ${numVariacoes} variações distintas + 1 hipótese de teste A/B + a métrica que mediria sucesso.`,
    ].join("\n");

    const completion = await openrouter.chat.completions.create({
      model: OR.claude,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { _raw: raw, _parseError: true };
    }

    await db.insert(hermesMemoriaInteracaoTable).values({
      userId,
      agentId: "crescimento",
      contexto: briefing.trim(),
      resposta: raw,
      metadata: { canal, publico, n: numVariacoes },
    });

    res.json({ ok: true, agent: "crescimento", canal, publico, ...parsed });
  } catch (err: any) {
    console.error("[hermes/crescimento] /gerar-copy error:", err);
    res.status(500).json({ erro: "Falha no agente de crescimento", _debug: err?.message ?? String(err) });
  }
});

export default router;
