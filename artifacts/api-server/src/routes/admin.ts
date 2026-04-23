import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { roleRequestsTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { isAdminUserAsync, getAdminDebugInfo } from "../lib/adminCheck";

/** Runs a DB query and returns its rows; on failure returns [] and logs the error */
async function safeQuery<T = any>(label: string, query: () => Promise<{ rows: T[] }>): Promise<T[]> {
  try {
    const result = await query();
    return result.rows as T[];
  } catch (err) {
    console.error(`[admin/stats] query '${label}' failed:`, err);
    return [];
  }
}
/** Runs a DB query and returns the first row; on failure returns null */
async function safeQueryOne<T = any>(label: string, query: () => Promise<{ rows: T[] }>): Promise<T | null> {
  const rows = await safeQuery<T>(label, query);
  return rows[0] ?? null;
}

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

// ─── Admin Stats Dashboard (fault-tolerant — individual query isolation) ────
router.get("/admin/stats", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) return res.status(403).json({ error: "Acesso negado" });

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const USD_TO_BRL = 5.85;

  // Ensure schema (idempotent)
  await safeQuery("ensure-schema", () => db.execute(sql`
    CREATE TABLE IF NOT EXISTS login_events (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      event_date DATE NOT NULL DEFAULT CURRENT_DATE,
      event_hour SMALLINT NOT NULL DEFAULT EXTRACT(HOUR FROM NOW())::smallint,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, event_date)
    )
  `));
  await safeQuery("ensure-last-seen", () => db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`));

  // ── User counts ─────────────────────────────────────────────────────────────
  const [
    totalUsersRow, todayNewRow, premiumRow, teacherRow, govRow, todayActiveRow,
    pendingRow, studyingNowRow,
  ] = await Promise.all([
    safeQueryOne("totalUsers",   () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users`)),
    safeQueryOne("todayNew",     () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date = ${today}::date`)),
    safeQueryOne("premium",      () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE stripe_subscription_status IN ('active','trialing')`)),
    safeQueryOne("teachers",     () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher'`)),
    safeQueryOne("gov",          () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'government'`)),
    safeQueryOne("todayActive",  () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date = ${today}`)),
    safeQueryOne("pending",      () => db.execute(sql`SELECT COUNT(*)::int AS count FROM role_requests WHERE status = 'pending'`)),
    safeQueryOne("studyingNow",  () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE last_seen_at >= NOW() - INTERVAL '30 minutes'`)),
  ]);

  // ── Subscription distribution (Financeiro) ──────────────────────────────────
  const subscriptionDist = await safeQuery("subsDist", () => db.execute(sql`
    SELECT COALESCE(stripe_subscription_status, 'free') AS status, COUNT(*)::int AS count
    FROM users GROUP BY stripe_subscription_status ORDER BY count DESC
  `));

  // ── Login events ─────────────────────────────────────────────────────────────
  const [loginsByDay, loginsByHour, recentLogins] = await Promise.all([
    safeQuery("loginsByDay", () => db.execute(sql`
      SELECT event_date::text AS day, COUNT(*)::int AS count
      FROM login_events WHERE event_date >= ${thirtyDaysAgo}::date
      GROUP BY event_date ORDER BY event_date
    `)),
    safeQuery("loginsByHour", () => db.execute(sql`
      SELECT event_hour AS hour, COUNT(*)::int AS count
      FROM login_events GROUP BY event_hour ORDER BY event_hour
    `)),
    safeQuery("recentLogins", () => db.execute(sql`
      SELECT DISTINCT ON (le.id) le.created_at, u.id, u.email, u.first_name, u.last_name, u.role
      FROM login_events le
      JOIN users u ON (u.id = le.user_id OR u.clerk_id = le.user_id)
      ORDER BY le.id DESC, le.created_at DESC LIMIT 20
    `)),
  ]);

  // ── Activity events (new unified events table) ─────────────────────────────
  const [recentEvents, eventsByType30d, activeUsersFromEvents] = await Promise.all([
    safeQuery("recentEvents", () => db.execute(sql`
      SELECT ae.event_type, ae.created_at, ae.metadata,
             u.email, u.first_name, u.last_name
      FROM activity_events ae
      LEFT JOIN users u ON u.id = ae.user_id OR u.clerk_id = ae.user_id
      ORDER BY ae.created_at DESC LIMIT 50
    `)),
    safeQuery("eventsByType30d", () => db.execute(sql`
      SELECT event_type, COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users
      FROM activity_events
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY event_type ORDER BY count DESC
    `)),
    safeQueryOne("activeUsersEvents", () => db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int AS count FROM activity_events
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
    `)),
  ]);

  // ── Per-day charts ───────────────────────────────────────────────────────────
  const [plansPerDay, simuladosPerDay, newUsersPerDay, activityHeatmap] = await Promise.all([
    safeQuery("plansPerDay",   () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM study_plans WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("simuladosPerDay", () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM simulado_results WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("newUsersPerDay", () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("activityHeatmap", () => db.execute(sql`SELECT study_date, COUNT(DISTINCT user_id)::int AS active_users FROM user_activity WHERE study_date >= ${thirtyDaysAgo} GROUP BY study_date ORDER BY study_date`)),
  ]);

  // ── Recent users + top materias ──────────────────────────────────────────────
  const [recentUsers, topMaterias] = await Promise.all([
    safeQuery("recentUsers", () => db.execute(sql`SELECT id, email, first_name, last_name, stripe_subscription_status, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`)),
    safeQuery("topMaterias", () => db.execute(sql`SELECT materia, COUNT(*)::int AS count, ROUND(AVG(CASE WHEN total > 0 THEN score::numeric/total*100 ELSE 0 END),1)::float AS avg_score FROM simulado_results GROUP BY materia ORDER BY count DESC LIMIT 6`)),
  ]);

  // ── AI cost metrics ───────────────────────────────────────────────────────────
  const [aiCostToday, aiCostMonth, aiCostByFeature, aiCostByModel, aiCostPerDay, aiCallsTotal] = await Promise.all([
    safeQueryOne("aiCostToday",  () => db.execute(sql`SELECT COALESCE(SUM(cost_usd::numeric), 0)::float AS total, COUNT(*)::int AS calls, COALESCE(SUM(tokens_in + tokens_out), 0)::int AS tokens FROM ai_cost_log WHERE created_at::date = ${today}::date`)),
    safeQueryOne("aiCostMonth",  () => db.execute(sql`SELECT COALESCE(SUM(cost_usd::numeric), 0)::float AS total, COUNT(*)::int AS calls FROM ai_cost_log WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`)),
    safeQuery("aiByFeature",     () => db.execute(sql`SELECT feature, COUNT(*)::int AS calls, COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd, COALESCE(SUM(tokens_in + tokens_out)::int, 0) AS tokens FROM ai_cost_log GROUP BY feature ORDER BY cost_usd DESC`)),
    safeQuery("aiByModel",       () => db.execute(sql`SELECT model, COUNT(*)::int AS calls, COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd FROM ai_cost_log GROUP BY model ORDER BY cost_usd DESC`)),
    safeQuery("aiPerDay",        () => db.execute(sql`SELECT created_at::date::text AS day, COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd, COUNT(*)::int AS calls FROM ai_cost_log WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY created_at::date ORDER BY day`)),
    safeQueryOne("aiCallsTotal", () => db.execute(sql`SELECT COUNT(*)::int AS calls, COALESCE(SUM(tokens_in + tokens_out), 0)::int AS tokens FROM ai_cost_log`)),
  ]);

  // ── AI feature metrics ────────────────────────────────────────────────────────
  const [
    trilhaRows, trilhaSess, notebookDocs, notebookOverviews, notebookOv7d,
    mindmapsPro, mindmapsDoc, tiagaoConv, tiagaoConv7d,
    redacoesAll, redacoes7d, flashRev7d, teacherContent, institutions,
  ] = await Promise.all([
    safeQuery("trilhaProgress", () => db.execute(sql`SELECT subject, COUNT(*)::int AS cnt, ROUND(AVG(level)::numeric,1)::float AS avg_level, MAX(level)::int AS max_level FROM trilha_mestre_progress GROUP BY subject`)),
    safeQueryOne("trilhaSess",  () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM trilha_mestre_sessions WHERE created_at >= NOW() - INTERVAL '7 days'`)),
    safeQueryOne("notebookDocs",() => db.execute(sql`SELECT COUNT(*)::int AS count, COALESCE(SUM(file_size_kb), 0)::int AS total_kb FROM knowledge_documents WHERE is_chunk = false OR is_chunk IS NULL`)),
    safeQueryOne("notebookOv",  () => db.execute(sql`SELECT COUNT(*)::int AS count FROM notebook_overviews`)),
    safeQueryOne("notebookOv7d",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM notebook_overviews WHERE created_at >= NOW() - INTERVAL '7 days'`)),
    safeQueryOne("mindmapsPro", () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT professor_id)::int AS users FROM professor_mindmaps`)),
    safeQueryOne("mindmapsDoc", () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM user_doc_mindmaps`)),
    safeQueryOne("tiagaoAll",   () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM tiagao_conversations`)),
    safeQueryOne("tiagao7d",    () => db.execute(sql`SELECT COUNT(*)::int AS count FROM tiagao_conversations WHERE created_at >= NOW() - INTERVAL '7 days'`)),
    safeQueryOne("redacoesAll", () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM redacoes`)),
    safeQueryOne("redacoes7d",  () => db.execute(sql`SELECT COUNT(*)::int AS count FROM redacoes WHERE created_at >= NOW() - INTERVAL '7 days'`)),
    safeQueryOne("flashRev7d",  () => db.execute(sql`SELECT COUNT(*)::int AS count FROM flashcard_reviews WHERE updated_at >= NOW() - INTERVAL '7 days'`)),
    safeQueryOne("teacherContent", () => db.execute(sql`SELECT COUNT(*)::int AS count FROM teacher_content`)),
    safeQueryOne("institutions", () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE contract_end IS NULL OR contract_end > NOW())::int AS active FROM instituicoes`)),
  ]);

  const costTodayUsd = (aiCostToday as any)?.total ?? 0;
  const costMonthUsd = (aiCostMonth as any)?.total ?? 0;
  const totalDocsKb = (notebookDocs as any)?.total_kb ?? 0;

  res.json({
    // User counts
    totalUsers: (totalUsersRow as any)?.count ?? 0,
    todayNewUsers: (todayNewRow as any)?.count ?? 0,
    premiumUsers: (premiumRow as any)?.count ?? 0,
    teacherCount: (teacherRow as any)?.count ?? 0,
    govCount: (govRow as any)?.count ?? 0,
    institutionsTotal: (institutions as any)?.count ?? 0,
    institutionsActive: (institutions as any)?.active ?? 0,
    todayActive: (todayActiveRow as any)?.count ?? 0,
    studyingNow: Math.max(
      (studyingNowRow as any)?.count ?? 0,
      (activeUsersFromEvents as any)?.count ?? 0,
    ),
    pendingRequests: (pendingRow as any)?.count ?? 0,

    // Financeiro
    subscriptionDist: subscriptionDist.map(r => ({ status: (r as any).status, count: (r as any).count })),

    // Charts
    plansPerDay,
    simuladosPerDay,
    newUsersPerDay,
    activityHeatmap,
    loginsByDay,
    loginsByHour,
    recentLogins,
    recentUsers,
    topMaterias,

    // Activity events (new unified events)
    recentEvents,
    eventsByType30d,

    // AI features
    aiFeatures: [
      { feature: "Tiagão (Voz)", uses: (tiagaoConv as any)?.count ?? 0, users: (tiagaoConv as any)?.users ?? 0, last7d: (tiagaoConv7d as any)?.count ?? 0 },
      { feature: "Trilha do Mestre", uses: (trilhaSess as any)?.count ?? 0, users: (trilhaSess as any)?.users ?? 0, last7d: (trilhaSess as any)?.count ?? 0 },
      { feature: "Notebook (RAG)", uses: (notebookOverviews as any)?.count ?? 0, users: 0, last7d: (notebookOv7d as any)?.count ?? 0 },
      { feature: "Mapa Mental", uses: ((mindmapsPro as any)?.count ?? 0) + ((mindmapsDoc as any)?.count ?? 0), users: ((mindmapsPro as any)?.users ?? 0) + ((mindmapsDoc as any)?.users ?? 0), last7d: 0 },
      { feature: "Redação", uses: (redacoesAll as any)?.count ?? 0, users: (redacoesAll as any)?.users ?? 0, last7d: (redacoes7d as any)?.count ?? 0 },
      { feature: "Flashcards", uses: (flashRev7d as any)?.count ?? 0, users: 0, last7d: (flashRev7d as any)?.count ?? 0 },
    ],
    aiProviders: [
      { id: "deepseek",   ok: !!process.env.DEEPSEEK_API_KEY },
      { id: "anthropic",  ok: !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY !== "_DUMMY_API_KEY_" },
      { id: "openai",     ok: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_API_KEY !== "_DUMMY_API_KEY_" },
      { id: "gemini",     ok: !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_API_KEY !== "_DUMMY_API_KEY_" },
      { id: "openrouter", ok: !!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY && process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY !== "_DUMMY_API_KEY_" },
      { id: "elevenlabs", ok: !!process.env.ELEVENLABS_API_KEY },
    ],
    trilhaBySubject: trilhaRows.map((r: any) => ({ subject: r.subject, students: r.cnt, avgLevel: r.avg_level, maxLevel: r.max_level })),
    diagnosticsCompleted30d: 0,
    notebookDocsTotal: (notebookDocs as any)?.count ?? 0,
    notebookStorageMb: Math.round(totalDocsKb / 1024),
    notebookOverviewsTotal: (notebookOverviews as any)?.count ?? 0,
    teacherContentTotal: (teacherContent as any)?.count ?? 0,
    contentBreakdown: [
      { label: "Documentos (PDF/Texto)", value: totalDocsKb, color: "#3b82f6" },
      { label: "Mapas Mentais", value: ((mindmapsPro as any)?.count ?? 0) + ((mindmapsDoc as any)?.count ?? 0), color: "#a855f7" },
      { label: "Questões ENEM", value: topMaterias.reduce((s: number, m: any) => s + (m.count ?? 0), 0), color: "#f59e0b" },
      { label: "Notebook Overviews", value: (notebookOverviews as any)?.count ?? 0, color: "#10b981" },
      { label: "Redações", value: (redacoesAll as any)?.count ?? 0, color: "#ef4444" },
    ],
    aiCost: {
      todayUsd: costTodayUsd,
      todayBrl: costTodayUsd * USD_TO_BRL,
      monthUsd: costMonthUsd,
      monthBrl: costMonthUsd * USD_TO_BRL,
      callsToday: (aiCostToday as any)?.calls ?? 0,
      callsTotal: (aiCallsTotal as any)?.calls ?? 0,
      tokensToday: (aiCostToday as any)?.tokens ?? 0,
      tokensTotal: (aiCallsTotal as any)?.tokens ?? 0,
      byFeature: aiCostByFeature.map((r: any) => ({ feature: r.feature, calls: r.calls, costUsd: r.cost_usd, costBrl: r.cost_usd * USD_TO_BRL, tokens: Number(r.tokens) })),
      byModel: aiCostByModel.map((r: any) => ({ model: r.model, calls: r.calls, costUsd: r.cost_usd, costBrl: r.cost_usd * USD_TO_BRL })),
      perDay: aiCostPerDay.map((r: any) => ({ day: r.day, costUsd: r.cost_usd, costBrl: r.cost_usd * USD_TO_BRL, calls: r.calls })),
    },
  });
});

export default router;
