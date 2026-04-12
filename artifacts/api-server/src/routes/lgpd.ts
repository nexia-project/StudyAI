import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

/**
 * POST /lgpd/delete-account
 * LGPD Art. 18 — Right to erasure.
 * Deletes ALL user data from the system and logs the user out.
 * Requires authentication.
 */
router.post("/lgpd/delete-account", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  const userId = req.user.id;

  try {
    // 1. Delete all sessions for this user (log out everywhere)
    await db.delete(sessionsTable).where(
      eq(sessionsTable.sid, (req as any).sessionID ?? ""),
    );

    // 2. Delete the user — cascade removes study_plans, simulado_results,
    //    flashcard_sessions, user_activity automatically (onDelete: "cascade").
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    // 3. Destroy the current session cookie
    req.session?.destroy(() => {});
    res.clearCookie("sid", { path: "/" });

    res.json({
      ok: true,
      message: "Todos os seus dados foram excluídos permanentemente conforme a LGPD (Lei nº 13.709/2018).",
    });
  } catch (err) {
    req.log.error({ err }, "LGPD delete-account error");
    res.status(500).json({ error: "Erro ao excluir conta. Entre em contato: privacidade@study.ia.br" });
  }
});

/**
 * GET /lgpd/my-data
 * LGPD Art. 18 — Right to access / data portability.
 * Returns a JSON summary of all data the platform holds about the user.
 */
router.get("/lgpd/my-data", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  const userId = req.user.id;

  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        stripeSubscriptionStatus: usersTable.stripeSubscriptionStatus,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    res.json({
      exportedAt: new Date().toISOString(),
      lei: "LGPD — Lei nº 13.709/2018, Art. 18",
      dados: {
        perfil: user ?? null,
        nota: "Planos de estudo, simulados, flashcards e atividades também são armazenados e vinculados ao seu ID.",
        contato: "Para dúvidas sobre seus dados: privacidade@study.ia.br",
      },
    });
  } catch (err) {
    req.log.error({ err }, "LGPD my-data error");
    res.status(500).json({ error: "Erro ao exportar dados. Tente novamente." });
  }
});

export default router;
