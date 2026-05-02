import { db, usersTable } from "@workspace/db";
import { eq, sql, lt, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const FREE_AI_LIMIT = 5;

export async function checkFreeUsage(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }

  try {
    const [user] = await db
      .select({
        stripeSubscriptionStatus: usersTable.stripeSubscriptionStatus,
        freeAiUses: usersTable.freeAiUses,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ erro: "Usuário não encontrado" });
      return;
    }

    const isPremium = user.stripeSubscriptionStatus === "active" || user.stripeSubscriptionStatus === "trialing";
    (req as any).isPremium = isPremium;

    if (isPremium) {
      next();
      return;
    }

    // Free tier: verificar limite
    if ((user.freeAiUses ?? 0) >= FREE_AI_LIMIT) {
      res.status(403).json({
        erro: "Limite gratuito atingido",
        limite: FREE_AI_LIMIT,
        usado: user.freeAiUses,
        upgrade: true,
      });
      return;
    }

    // Incrementar uso
    await db
      .update(usersTable)
      .set({ freeAiUses: sql`${usersTable.freeAiUses} + 1` })
      .where(eq(usersTable.id, req.userId));

    next();
  } catch (err) {
    console.error("checkFreeUsage error:", err);
    // Em caso de erro, permite acesso (fail-open) para não bloquear usuários
    (req as any).isPremium = false;
    next();
  }
}
