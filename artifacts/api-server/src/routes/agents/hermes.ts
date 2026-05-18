import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  hermesAcoesProativasTable,
  hermesAdminInboxTable,
  hermesDescobertasGlobaisTable,
} from "@workspace/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../lib/hermes/requireAdmin";
import { getHermesCronHint } from "../../lib/hermes/cronState";
import type { ContentIndexSummary } from "../../lib/hermes/jobs/knowledge-index";
import { getHermesDorRealCatalog } from "../../lib/hermes/jobs/dor-real-agents";

const router: IRouter = Router();

function extractContentIndex(evidencia: unknown): ContentIndexSummary | null {
  if (!evidencia || typeof evidencia !== "object") return null;
  const ev = evidencia as Record<string, unknown>;
  if (ev.kind !== "content_index") return null;
  const idx = ev.contentIndex;
  if (!idx || typeof idx !== "object") return null;
  return idx as ContentIndexSummary;
}

/**
 * GET /api/agents/hermes/status
 * Read-only monitoring snapshot for admin dashboards.
 */
router.get("/status", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [descobertas, inboxUnread, pendingAcoesRow] = await Promise.all([
      db
        .select()
        .from(hermesDescobertasGlobaisTable)
        .orderBy(desc(hermesDescobertasGlobaisTable.createdAt))
        .limit(10),
      db
        .select()
        .from(hermesAdminInboxTable)
        .where(
          and(eq(hermesAdminInboxTable.lida, false), isNull(hermesAdminInboxTable.dismissedAt)),
        )
        .orderBy(desc(hermesAdminInboxTable.createdAt))
        .limit(10),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(hermesAcoesProativasTable)
        .where(eq(hermesAcoesProativasTable.status, "pending")),
    ]);

    const unreadCountRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hermesAdminInboxTable)
      .where(
        and(eq(hermesAdminInboxTable.lida, false), isNull(hermesAdminInboxTable.dismissedAt)),
      );

    const unreadCount = Number(unreadCountRow[0]?.count ?? 0);
    const pendingAcoesCount = Number(pendingAcoesRow[0]?.count ?? 0);

    let contentIndex: ContentIndexSummary | null = null;
    for (const row of descobertas) {
      const idx = extractContentIndex(row.evidencia);
      if (idx) {
        contentIndex = idx;
        break;
      }
    }

    res.json({
      ok: true,
      descobertas,
      inbox: {
        items: inboxUnread,
        unreadCount,
      },
      pendingAcoesCount,
      lastCronHint: getHermesCronHint(),
      contentIndex,
      dorRealAgents: getHermesDorRealCatalog(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hermes] GET /status error:", err);
    res.status(500).json({ erro: "Falha ao carregar status Hermes", _debug: message });
  }
});

export default router;
