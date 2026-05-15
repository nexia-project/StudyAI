import { db } from "@workspace/db";
import { hermesAdminInboxTable } from "@workspace/db/schema";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

export async function inboxProactive(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await db
    .update(hermesAdminInboxTable)
    .set({ dismissedAt: new Date() })
    .where(
      and(
        isNull(hermesAdminInboxTable.dismissedAt),
        eq(hermesAdminInboxTable.lida, true),
        lt(hermesAdminInboxTable.createdAt, cutoff),
      ),
    );

  const stale = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hermesAdminInboxTable)
    .where(
      and(
        isNull(hermesAdminInboxTable.dismissedAt),
        eq(hermesAdminInboxTable.lida, false),
        lt(hermesAdminInboxTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      ),
    );

  const staleCount = Number(stale[0]?.count ?? 0);
  if (staleCount < 5) return;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recent] = await db
    .select({ id: hermesAdminInboxTable.id })
    .from(hermesAdminInboxTable)
    .where(
      and(
        eq(hermesAdminInboxTable.agentId, "inbox"),
        eq(hermesAdminInboxTable.tipo, "housekeeping"),
        gte(hermesAdminInboxTable.createdAt, dayAgo),
      ),
    )
    .limit(1);
  if (recent) return;

  await db.insert(hermesAdminInboxTable).values({
    agentId: "inbox",
    tipo: "housekeeping",
    titulo: `${staleCount} notificações antigas não lidas`,
    corpo: "Revise o inbox — há alertas com mais de 7 dias sem leitura.",
    payload: { staleCount },
  });
}
