import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  simuladoResultsTable,
  flashcardSessionsTable,
  userActivityTable,
  studyPlansTable,
  instituicoesTable,
  turmasTable,
  turmaMembershipsTable,
} from "@workspace/db/schema";
import { eq, sql, gte, desc } from "drizzle-orm";

const router: IRouter = Router();

async function isGovernmentOrAdmin(userId: string): Promise<boolean> {
  const user = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return ["government", "admin"].includes(user[0]?.role ?? "");
}

// ─── Global stats ─────────────────────────────────────────────────────────────
router.get("/government/stats", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isGovernmentOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [totalSims] = await db.select({ count: sql<number>`count(*)::int` }).from(simuladoResultsTable);
  const [avgSim] = await db.select({ avg: sql<number>`avg(${simuladoResultsTable.score}::float / nullif(${simuladoResultsTable.total},0)*100)` }).from(simuladoResultsTable);
  const [totalFlash] = await db.select({ count: sql<number>`count(*)::int` }).from(flashcardSessionsTable);
  const [totalPlans] = await db.select({ count: sql<number>`count(*)::int` }).from(studyPlansTable);
  const [avgXp] = await db.select({ avg: sql<number>`avg(${usersTable.xp})` }).from(usersTable);
  const [totalInst] = await db.select({ count: sql<number>`count(*)::int` }).from(instituicoesTable);
  const [totalTurmas] = await db.select({ count: sql<number>`count(*)::int` }).from(turmasTable);

  // Active last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [activeUsers30] = await db.select({ count: sql<number>`count(distinct ${userActivityTable.userId})::int` })
    .from(userActivityTable).where(gte(userActivityTable.createdAt, thirtyDaysAgo));

  // Active last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [activeUsers7] = await db.select({ count: sql<number>`count(distinct ${userActivityTable.userId})::int` })
    .from(userActivityTable).where(gte(userActivityTable.createdAt, sevenDaysAgo));

  // New users this month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const [newThisMonth] = await db.select({ count: sql<number>`count(*)::int` })
    .from(usersTable).where(gte(usersTable.createdAt, firstOfMonth));

  // Subscription breakdown
  const subStats = await db.select({
    status: usersTable.stripeSubscriptionStatus,
    count: sql<number>`count(*)::int`,
  }).from(usersTable).groupBy(usersTable.stripeSubscriptionStatus);

  // Growth: users per week for last 8 weeks
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const weeklyGrowth = await db.select({
    week: sql<string>`date_trunc('week', ${usersTable.createdAt})::text`,
    count: sql<number>`count(*)::int`,
  }).from(usersTable)
    .where(gte(usersTable.createdAt, eightWeeksAgo))
    .groupBy(sql`date_trunc('week', ${usersTable.createdAt})`)
    .orderBy(sql`date_trunc('week', ${usersTable.createdAt})`);

  // Simulados per week
  const weeklyActivity = await db.select({
    week: sql<string>`date_trunc('week', ${simuladoResultsTable.createdAt})::text`,
    count: sql<number>`count(*)::int`,
  }).from(simuladoResultsTable)
    .where(gte(simuladoResultsTable.createdAt, eightWeeksAgo))
    .groupBy(sql`date_trunc('week', ${simuladoResultsTable.createdAt})`)
    .orderBy(sql`date_trunc('week', ${simuladoResultsTable.createdAt})`);

  // Top subjects by simulado count
  const topSubjects = await db.select({
    materia: simuladoResultsTable.materia,
    count: sql<number>`count(*)::int`,
    avgAccuracy: sql<number>`avg(${simuladoResultsTable.score}::float / nullif(${simuladoResultsTable.total},0)*100)`,
  }).from(simuladoResultsTable)
    .groupBy(simuladoResultsTable.materia)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  res.json({
    overview: {
      totalUsers: totalUsers.count,
      totalSimulados: totalSims.count,
      avgSimAccuracy: Math.round(avgSim.avg ?? 0),
      totalFlashcards: totalFlash.count,
      totalPlanos: totalPlans.count,
      avgXp: Math.round(avgXp.avg ?? 0),
      totalInstituicoes: totalInst.count,
      totalTurmas: totalTurmas.count,
      activeUsers30: activeUsers30.count,
      activeUsers7: activeUsers7.count,
      newUsersThisMonth: newThisMonth.count,
      engagementRate30d: totalUsers.count > 0
        ? Math.round((activeUsers30.count / totalUsers.count) * 100)
        : 0,
    },
    subscriptions: subStats,
    weeklyGrowth,
    weeklyActivity,
    topSubjects: topSubjects.map(s => ({
      materia: s.materia,
      count: s.count,
      avgAccuracy: Math.round(s.avgAccuracy ?? 0),
    })),
  });
});

// ─── Request government access ────────────────────────────────────────────────
router.post("/government/request-access", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { organ, position, cpf, message } = req.body as { organ?: string; position?: string; cpf?: string; message?: string };
  if (!organ || !position || !cpf) { res.status(400).json({ error: "Órgão, cargo e CPF são obrigatórios" }); return; }

  try {
    const [user] = await db.select({ email: usersTable.email, firstName: usersTable.firstName }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
    req.log.info({ userId: req.userId, email: user?.email, organ, position, cpf, message }, "Government access request received");
    res.json({ success: true, message: "Solicitação recebida. Nossa equipe irá validar em até 48 horas." });
  } catch (err) {
    req.log.error({ err }, "Error processing government access request");
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

router.post("/government/promote", async (req: Request, res: Response) => {
  if (!!!req.userId || req.userId! !== "44063371") {
    res.status(403).json({ error: "Acesso negado" }); return;
  }
  const { userId, role } = req.body as { userId?: string; role?: string };
  const validRoles = ["student", "teacher", "institution_admin", "government", "admin"];
  if (!userId || !role || !validRoles.includes(role)) {
    res.status(400).json({ error: "userId e role válido são obrigatórios" }); return;
  }

  await db.update(usersTable).set({ role }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;
