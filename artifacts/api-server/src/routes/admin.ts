import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { roleRequestsTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { isAdminUserAsync, getAdminDebugInfo } from "../lib/adminCheck";

const router = Router();

// Debug endpoint — returns full auth & admin status info
router.get("/admin/whoami", async (req: Request, res: Response) => {
  const debug = await getAdminDebugInfo(req.userId);
  const isAdmin = await isAdminUserAsync(req.userId);
  res.json({ userId: req.userId ?? null, authenticated: !!req.userId, isAdmin, ...debug });
});

router.get("/admin/users", async (req: Request, res: Response) => {
  req.log.info({ userId: req.userId }, "admin/users check");
  if (!await isAdminUserAsync(req.userId)) return res.status(403).json({ error: "Acesso negado", userId: req.userId ?? null });
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
  if (!await isAdminUserAsync(req.userId)) return res.status(403).json({ error: "Acesso negado" });
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

// ─── Role requests: list ──────────────────────────────────────────────────────
router.get("/admin/role-requests", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const requests = await db
      .select({
        id: roleRequestsTable.id,
        userId: roleRequestsTable.userId,
        requestedRole: roleRequestsTable.requestedRole,
        status: roleRequestsTable.status,
        school: roleRequestsTable.school,
        subject: roleRequestsTable.subject,
        organ: roleRequestsTable.organ,
        position: roleRequestsTable.position,
        cpf: roleRequestsTable.cpf,
        message: roleRequestsTable.message,
        createdAt: roleRequestsTable.createdAt,
        reviewedAt: roleRequestsTable.reviewedAt,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(roleRequestsTable)
      .leftJoin(usersTable, eq(roleRequestsTable.userId, usersTable.id))
      .orderBy(desc(roleRequestsTable.createdAt));
    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Error fetching role requests");
    res.status(500).json({ error: "Erro ao buscar solicitações" });
  }
});

// ─── Role requests: approve or reject ────────────────────────────────────────
router.post("/admin/role-requests/:id/review", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return res.status(403).json({ error: "Acesso negado" });
  const { id } = req.params;
  const { action } = req.body as { action: "approve" | "reject" };
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Ação inválida" });
  }

  try {
    const [request] = await db
      .select()
      .from(roleRequestsTable)
      .where(and(eq(roleRequestsTable.id, id), eq(roleRequestsTable.status, "pending")))
      .limit(1);

    if (!request) {
      return res.status(404).json({ error: "Solicitação não encontrada ou já processada" });
    }

    if (action === "approve") {
      await db.update(usersTable).set({ role: request.requestedRole }).where(eq(usersTable.id, request.userId));
    }

    await db.update(roleRequestsTable).set({
      status: action === "approve" ? "approved" : "rejected",
      reviewedBy: req.userId!,
      reviewedAt: new Date(),
    }).where(eq(roleRequestsTable.id, id));

    res.json({ ok: true, action, role: request.requestedRole });
  } catch (err) {
    req.log.error({ err }, "Error reviewing role request");
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

// ─── Admin Stats Dashboard ─────────────────────────────────────────────────
router.get("/admin/stats", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [totalUsers] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM users`);
    const [todayNewUsers] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date = ${today}::date`);
    const [premiumUsers] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE stripe_subscription_status IN ('active','trialing')`);
    const [teacherCount] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher'`);
    const [govCount] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'government'`);
    const [todayActive] = await db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date = ${today}`);
    const [pendingReq] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM role_requests WHERE status = 'pending'`);

    // Study plans last 7 days per day
    const plansPerDay = await db.execute(sql`
      SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count
      FROM study_plans
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `);

    // Simulados last 7 days
    const simuladosPerDay = await db.execute(sql`
      SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count
      FROM simulado_results
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `);

    // New users per day last 7 days
    const newUsersPerDay = await db.execute(sql`
      SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `);

    // Recent users
    const recentUsers = await db.execute(sql`
      SELECT id, email, first_name, last_name, stripe_subscription_status, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Top matérias from simulados
    const topMaterias = await db.execute(sql`
      SELECT materia, COUNT(*)::int AS count, ROUND(AVG(CASE WHEN total > 0 THEN score::numeric/total*100 ELSE 0 END),1)::float AS avg_score
      FROM simulado_results
      GROUP BY materia
      ORDER BY count DESC
      LIMIT 6
    `);

    // Activity heatmap last 30 days
    const activityHeatmap = await db.execute(sql`
      SELECT study_date, COUNT(DISTINCT user_id)::int AS active_users
      FROM user_activity
      WHERE study_date >= ${thirtyDaysAgo}
      GROUP BY study_date
      ORDER BY study_date
    `);

    res.json({
      totalUsers: (totalUsers.rows[0] as any)?.count ?? 0,
      todayNewUsers: (todayNewUsers.rows[0] as any)?.count ?? 0,
      premiumUsers: (premiumUsers.rows[0] as any)?.count ?? 0,
      teacherCount: (teacherCount.rows[0] as any)?.count ?? 0,
      govCount: (govCount.rows[0] as any)?.count ?? 0,
      todayActive: (todayActive.rows[0] as any)?.count ?? 0,
      pendingRequests: (pendingReq.rows[0] as any)?.count ?? 0,
      plansPerDay: plansPerDay.rows,
      simuladosPerDay: simuladosPerDay.rows,
      newUsersPerDay: newUsersPerDay.rows,
      recentUsers: recentUsers.rows,
      topMaterias: topMaterias.rows,
      activityHeatmap: activityHeatmap.rows,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

export default router;
