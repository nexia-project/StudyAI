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
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ erro: "Usuário não encontrado" });
      return;
    }

    // Admins always have unlimited premium access
    const isAdmin = ["admin", "institution_admin"].includes(user.role ?? "");
    if (isAdmin) {
      (req as any).isPremium = true;
      (req as any).isAdmin = true;
      next();
      return;
    }

    const isPremium =
      user.stripeSubscriptionStatus === "active" ||
      user.stripeSubscriptionStatus === "trialing";

    if (isPremium) {
      (req as any).isPremium = true;
      next();
      return;
    }

    // Atomic check-and-increment: only increments if uses < FREE_AI_LIMIT
    // This prevents race conditions where two requests read the same count
    const updated = await db
      .update(usersTable)
      .set({ freeAiUses: sql`${usersTable.freeAiUses} + 1` })
      .where(
        and(
          eq(usersTable.id, req.userId!),
          lt(usersTable.freeAiUses, FREE_AI_LIMIT)
        )
      )
      .returning({ freeAiUses: usersTable.freeAiUses });

    if (updated.length === 0) {
      const currentUses = user.freeAiUses ?? 0;
      res.status(402).json({
        erro: "limite_gratuito",
        mensagem: `Você usou seus ${FREE_AI_LIMIT} estudos gratuitos. Assine o plano para continuar.`,
        usosUtilizados: currentUses,
        limite: FREE_AI_LIMIT,
      });
      return;
    }

    (req as any).isPremium = false;
    (req as any).freeAiUsesAfter = updated[0]?.freeAiUses ?? 0;
    next();
  } catch (err) {
    next(err);
  }
}
