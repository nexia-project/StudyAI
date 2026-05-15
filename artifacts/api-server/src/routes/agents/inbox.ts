import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { hermesAdminInboxTable } from "@workspace/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../lib/hermes/requireAdmin";

const router: IRouter = Router();

router.get("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const includeDismissed = req.query.includeDismissed === "true";
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));

  try {
    const conditions = includeDismissed
      ? undefined
      : isNull(hermesAdminInboxTable.dismissedAt);

    const rows = await db
      .select()
      .from(hermesAdminInboxTable)
      .where(conditions)
      .orderBy(desc(hermesAdminInboxTable.createdAt))
      .limit(limit);

    res.json({ ok: true, total: rows.length, items: rows });
  } catch (err: any) {
    console.error("[hermes/inbox] GET / error:", err);
    res.status(500).json({ erro: "Falha ao listar inbox", _debug: err?.message ?? String(err) });
  }
});

router.post("/read", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id, ids } = (req.body ?? {}) as { id?: string; ids?: string[] };
  const targetIds = ids?.length ? ids : id ? [id] : [];

  if (!targetIds.length) {
    res.status(400).json({ erro: "Informe 'id' ou 'ids'" });
    return;
  }

  try {
    for (const itemId of targetIds) {
      await db
        .update(hermesAdminInboxTable)
        .set({ lida: true })
        .where(
          and(eq(hermesAdminInboxTable.id, itemId), isNull(hermesAdminInboxTable.dismissedAt)),
        );
    }
    res.json({ ok: true, marked: targetIds.length });
  } catch (err: any) {
    console.error("[hermes/inbox] POST /read error:", err);
    res.status(500).json({ erro: "Falha ao marcar como lida", _debug: err?.message ?? String(err) });
  }
});

router.post("/dismiss", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id, ids } = (req.body ?? {}) as { id?: string; ids?: string[] };
  const targetIds = ids?.length ? ids : id ? [id] : [];

  if (!targetIds.length) {
    res.status(400).json({ erro: "Informe 'id' ou 'ids'" });
    return;
  }

  try {
    const now = new Date();
    for (const itemId of targetIds) {
      await db
        .update(hermesAdminInboxTable)
        .set({ dismissedAt: now, lida: true })
        .where(eq(hermesAdminInboxTable.id, itemId));
    }
    res.json({ ok: true, dismissed: targetIds.length });
  } catch (err: any) {
    console.error("[hermes/inbox] POST /dismiss error:", err);
    res.status(500).json({ erro: "Falha ao dispensar", _debug: err?.message ?? String(err) });
  }
});

export default router;
