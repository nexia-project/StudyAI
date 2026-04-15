import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const ADMIN_USER_IDS = new Set(["44063371"]);

function isAdmin(req: Request): boolean {
  return req.isAuthenticated() && ADMIN_USER_IDS.has(String((req.user as any)?.id));
}

router.get("/admin/users", async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        stripeSubscriptionStatus: usersTable.stripeSubscriptionStatus,
        stripeCustomerId: usersTable.stripeCustomerId,
        stripeSubscriptionId: usersTable.stripeSubscriptionId,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));
    res.json({ users });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin users");
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

router.patch("/admin/users/:id/status", async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Acesso negado" });
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const allowed = ["free", "active", "trialing", "canceled", "past_due"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Status inválido", allowed });
  }
  try {
    await db
      .update(usersTable)
      .set({ stripeSubscriptionStatus: status, updatedAt: new Date() })
      .where(eq(usersTable.id, id));
    res.json({ ok: true, id, status });
  } catch (err) {
    req.log.error({ err }, "Error updating user status");
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

export default router;
