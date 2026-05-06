import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { roleRequestsTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { isAdminUserAsync, getAdminDebugInfo } from "../lib/adminCheck";
import { cacheStats } from "../lib/semanticCache";
import { getFullMemoryContext } from "../lib/generativeMemory";

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
  if (!req.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const debug = await getAdminDebugInfo(req.userId);
  const isAdmin = await isAdminUserAsync(req.userId);
  // Não expõe debug info para não-admins
  if (!isAdmin) {
    res.json({ userId: req.userId, authenticated: true, isAdmin: false });
    return;
  }
  res.json({ userId: req.userId, authenticated: true, isAdmin, ...debug });
});

router.get("/admin/users", async (req: Request, res: Response) => {
  req.log.info({ userId: req.userId }, "admin/users check");
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado", userId: req.userId ?? null });
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
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });
  const id = String(String(req.params.id));
  const { status } = req.body as { status: string };
  const allowed = ["free", "active", "trialing", "canceled", "past_due"];
  if (!allowed.includes(status)) {
    return void res.status(400).json({ error: "Status inválido", allowed });
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
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });
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
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });
  const id = String(String(req.params.id));
  const { action } = req.body as { action: "approve" | "reject" };
  if (!["approve", "reject"].includes(action)) {
    return void res.status(400).json({ error: "Ação inválida" });
  }

  try {
    const [request] = await db
      .select()
      .from(roleRequestsTable)
      .where(and(eq(roleRequestsTable.id, id), eq(roleRequestsTable.status, "pending")))
      .limit(1);

    if (!request) {
      return void res.status(404).json({ error: "Solicitação não encontrada ou já processada" });
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
  if (!await isAdminUserAsync(req.userId)) return void res.status(403).json({ error: "Acesso negado" });

  const today = new Date().toISOString().slice(0, 10);
  const USD_TO_BRL = 5.85;

  // ── Date range from query params (default: last 30 days) ─────────────────
  const qFrom = typeof req.query.from === "string" ? req.query.from : null;
  const qTo   = typeof req.query.to   === "string" ? req.query.to   : null;
  const rangeFrom = qFrom ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const rangeTo   = qTo   ?? today;

  // Previous period: same number of days, shifted back
  const rangeDays = Math.ceil((new Date(rangeTo).getTime() - new Date(rangeFrom).getTime()) / 86400000) + 1;
  const prevTo   = new Date(new Date(rangeFrom).getTime() - 86400000).toISOString().slice(0, 10);
  const prevFrom = new Date(new Date(rangeFrom).getTime() - rangeDays * 86400000).toISOString().slice(0, 10);


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
    newUsersInRange, prevNewUsersRow, activeInRange, prevActiveRow,
  ] = await Promise.all([
    safeQueryOne("totalUsers",     () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users`)),
    safeQueryOne("todayNew",       () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date = ${today}::date`)),
    safeQueryOne("premium",        () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE stripe_subscription_status IN ('active','trialing')`)),
    safeQueryOne("teachers",       () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher'`)),
    safeQueryOne("gov",            () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'government'`)),
    safeQueryOne("todayActive",    () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date = ${today}`)),
    safeQueryOne("pending",        () => db.execute(sql`SELECT COUNT(*)::int AS count FROM role_requests WHERE status = 'pending'`)),
    safeQueryOne("studyingNow",    () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE last_seen_at >= NOW() - INTERVAL '30 minutes'`)),
    safeQueryOne("newInRange",     () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("prevNewUsers",   () => db.execute(sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at::date BETWEEN ${prevFrom}::date AND ${prevTo}::date`)),
    safeQueryOne("activeInRange",  () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date BETWEEN ${rangeFrom} AND ${rangeTo}`)),
    safeQueryOne("prevActive",     () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_activity WHERE study_date BETWEEN ${prevFrom} AND ${prevTo}`)),
  ]);

  // ── Subscription distribution (Financeiro) ──────────────────────────────────
  const subscriptionDist = await safeQuery("subsDist", () => db.execute(sql`
    SELECT COALESCE(stripe_subscription_status, 'free') AS status, COUNT(*)::int AS count
    FROM users GROUP BY stripe_subscription_status ORDER BY count DESC
  `));

  // ── Login events ─────────────────────────────────────────────────────────────
  const [loginsByDay, loginsByHour, recentLogins, loginsInRange, prevLoginsRow] = await Promise.all([
    safeQuery("loginsByDay", () => db.execute(sql`
      SELECT event_date::text AS day, COUNT(*)::int AS count
      FROM login_events WHERE event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      GROUP BY event_date ORDER BY event_date
    `)),
    safeQuery("loginsByHour", () => db.execute(sql`
      SELECT event_hour AS hour, COUNT(*)::int AS count
      FROM login_events WHERE event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      GROUP BY event_hour ORDER BY event_hour
    `)),
    safeQuery("recentLogins", () => db.execute(sql`
      SELECT DISTINCT ON (le.id) le.created_at, u.id, u.email, u.first_name, u.last_name, u.role
      FROM login_events le
      JOIN users u ON (u.id = le.user_id OR u.clerk_id = le.user_id)
      WHERE le.event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      ORDER BY le.id DESC, le.created_at DESC LIMIT 20
    `)),
    safeQueryOne("loginsInRange", () => db.execute(sql`SELECT COUNT(*)::int AS count FROM login_events WHERE event_date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("prevLogins",    () => db.execute(sql`SELECT COUNT(*)::int AS count FROM login_events WHERE event_date BETWEEN ${prevFrom}::date AND ${prevTo}::date`)),
  ]);

  // ── Activity events ────────────────────────────────────────────────────────
  const [recentEvents, eventsByType30d, activeUsersFromEvents] = await Promise.all([
    safeQuery("recentEvents", () => db.execute(sql`
      SELECT ae.event_type, ae.created_at, ae.metadata, u.email, u.first_name, u.last_name
      FROM activity_events ae
      LEFT JOIN users u ON u.id = ae.user_id OR u.clerk_id = ae.user_id
      WHERE ae.created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      ORDER BY ae.created_at DESC LIMIT 50
    `)),
    safeQuery("eventsByTypeRange", () => db.execute(sql`
      SELECT event_type, COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users
      FROM activity_events
      WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date
      GROUP BY event_type ORDER BY count DESC
    `)),
    safeQueryOne("activeUsersEvents", () => db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int AS count FROM activity_events
      WHERE created_at >= NOW() - INTERVAL '30 minutes'
    `)),
  ]);

  // ── Per-day charts ───────────────────────────────────────────────────────────
  const [plansPerDay, simuladosPerDay, newUsersPerDay, activityHeatmap] = await Promise.all([
    safeQuery("plansPerDay",     () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM study_plans WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("simuladosPerDay", () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM simulado_results WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("newUsersPerDay",  () => db.execute(sql`SELECT DATE(created_at)::text AS day, COUNT(*)::int AS count FROM users WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY DATE(created_at) ORDER BY day`)),
    safeQuery("activityHeatmap", () => db.execute(sql`SELECT study_date, COUNT(DISTINCT user_id)::int AS active_users FROM user_activity WHERE study_date BETWEEN ${rangeFrom} AND ${rangeTo} GROUP BY study_date ORDER BY study_date`)),
  ]);

  // ── Recent users + top materias ──────────────────────────────────────────────
  const [recentUsers, topMaterias] = await Promise.all([
    safeQuery("recentUsers", () => db.execute(sql`SELECT id, email, first_name, last_name, stripe_subscription_status, role, created_at FROM users WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date ORDER BY created_at DESC LIMIT 10`)),
    safeQuery("topMaterias", () => db.execute(sql`SELECT materia, COUNT(*)::int AS count, ROUND(AVG(CASE WHEN total > 0 THEN score::numeric/total*100 ELSE 0 END),1)::float AS avg_score FROM simulado_results WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY materia ORDER BY count DESC LIMIT 6`)),
  ]);

  // ── AI cost metrics ───────────────────────────────────────────────────────────
  const [aiCostRange, aiCostPrev, aiCostByFeature, aiCostByModel, aiCostPerDay, aiCallsTotal, aiCostToday, aiCostMonth] = await Promise.all([
    safeQueryOne("aiCostRange",  () => db.execute(sql`SELECT COALESCE(SUM(cost_usd::numeric), 0)::float AS total, COUNT(*)::int AS calls, COALESCE(SUM(tokens_in + tokens_out), 0)::int AS tokens FROM ai_cost_log WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("aiCostPrev",   () => db.execute(sql`SELECT COALESCE(SUM(cost_usd::numeric), 0)::float AS total FROM ai_cost_log WHERE created_at::date BETWEEN ${prevFrom}::date AND ${prevTo}::date`)),
    safeQuery("aiByFeature",     () => db.execute(sql`SELECT feature, COUNT(*)::int AS calls, COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd, COALESCE(SUM(tokens_in + tokens_out)::int, 0) AS tokens FROM ai_cost_log WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY feature ORDER BY cost_usd DESC`)),
    safeQuery("aiByModel",       () => db.execute(sql`SELECT model, COUNT(*)::int AS calls, COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd FROM ai_cost_log WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY model ORDER BY cost_usd DESC`)),
    safeQuery("aiPerDay",        () => db.execute(sql`SELECT created_at::date::text AS day, COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd, COUNT(*)::int AS calls FROM ai_cost_log WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date GROUP BY created_at::date ORDER BY day`)),
    safeQueryOne("aiCallsTotal", () => db.execute(sql`SELECT COUNT(*)::int AS calls, COALESCE(SUM(tokens_in + tokens_out), 0)::int AS tokens FROM ai_cost_log`)),
    safeQueryOne("aiCostToday",  () => db.execute(sql`SELECT COALESCE(SUM(cost_usd::numeric), 0)::float AS total, COUNT(*)::int AS calls FROM ai_cost_log WHERE created_at::date = ${today}::date`)),
    safeQueryOne("aiCostMonth",  () => db.execute(sql`SELECT COALESCE(SUM(cost_usd::numeric), 0)::float AS total FROM ai_cost_log WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`)),
  ]);

  // ── AI feature metrics (date-filtered) ────────────────────────────────────────
  const [
    trilhaRows, trilhaSess, notebookDocs, notebookOverviews, notebookOvRange,
    mindmapsPro, mindmapsDoc, tiagaoConv, tiagaoConvRange,
    redacoesAll, redacoesRange, flashRevRange, teacherContent, institutions,
  ] = await Promise.all([
    safeQuery("trilhaProgress",  () => db.execute(sql`SELECT subject, COUNT(*)::int AS cnt, ROUND(AVG(level)::numeric,1)::float AS avg_level, MAX(level)::int AS max_level FROM trilha_mestre_progress GROUP BY subject`)),
    safeQueryOne("trilhaSess",   () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM trilha_mestre_sessions WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("notebookDocs", () => db.execute(sql`SELECT COUNT(*)::int AS count, COALESCE(SUM(file_size_kb), 0)::int AS total_kb FROM knowledge_documents WHERE is_chunk = false OR is_chunk IS NULL`)),
    safeQueryOne("notebookOv",   () => db.execute(sql`SELECT COUNT(*)::int AS count FROM notebook_overviews`)),
    safeQueryOne("notebookOvRng",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM notebook_overviews WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("mindmapsPro",  () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT professor_id)::int AS users FROM professor_mindmaps`)),
    safeQueryOne("mindmapsDoc",  () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM user_doc_mindmaps`)),
    safeQueryOne("tiagaoAll",    () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM tiagao_conversations`)),
    safeQueryOne("tiagaoRange",  () => db.execute(sql`SELECT COUNT(DISTINCT user_id)::int AS count FROM tiagao_conversations WHERE criado_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("redacoesAll",  () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(DISTINCT user_id)::int AS users FROM redacoes`)),
    safeQueryOne("redacoesRange",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM redacoes WHERE created_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("flashRevRange",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM flashcard_reviews WHERE updated_at::date BETWEEN ${rangeFrom}::date AND ${rangeTo}::date`)),
    safeQueryOne("teacherContent",() => db.execute(sql`SELECT COUNT(*)::int AS count FROM teacher_content`)),
    safeQueryOne("institutions", () => db.execute(sql`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE contract_end IS NULL OR contract_end > NOW())::int AS active FROM instituicoes`)),
  ]);

  const costRangeUsd  = (aiCostRange as any)?.total ?? 0;
  const costPrevUsd   = (aiCostPrev as any)?.total ?? 0;
  const costTodayUsd  = (aiCostToday as any)?.total ?? 0;
  const costMonthUsd  = (aiCostMonth as any)?.total ?? 0;
  const totalDocsKb   = (notebookDocs as any)?.total_kb ?? 0;

  // ── Helper: compute % change ─────────────────────────────────────────────────
  const pct = (cur: number, prev: number) => prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);

  res.json({
    // ── Meta: the applied date range (so UI can show it) ──────────────────────
    dateRange: { from: rangeFrom, to: rangeTo, prevFrom, prevTo, days: rangeDays },

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

    // Range-specific counts with comparison
    newUsersInRange:    (newUsersInRange as any)?.count ?? 0,
    prevNewUsers:       (prevNewUsersRow as any)?.count ?? 0,
    newUsersPct:        pct((newUsersInRange as any)?.count ?? 0, (prevNewUsersRow as any)?.count ?? 0),
    activeInRange:      (activeInRange as any)?.count ?? 0,
    prevActive:         (prevActiveRow as any)?.count ?? 0,
    activePct:          pct((activeInRange as any)?.count ?? 0, (prevActiveRow as any)?.count ?? 0),
    loginsInRange:      (loginsInRange as any)?.count ?? 0,
    prevLogins:         (prevLoginsRow as any)?.count ?? 0,
    loginsPct:          pct((loginsInRange as any)?.count ?? 0, (prevLoginsRow as any)?.count ?? 0),

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

    // Activity events
    recentEvents,
    eventsByType30d,

    // AI features
    aiFeatures: [
      { feature: "Tiagão (Voz)",  uses: (tiagaoConvRange as any)?.count ?? 0, users: (tiagaoConv as any)?.users ?? 0, last7d: (tiagaoConvRange as any)?.count ?? 0 },
      { feature: "Trilha do Mestre", uses: (trilhaSess as any)?.count ?? 0, users: (trilhaSess as any)?.users ?? 0, last7d: (trilhaSess as any)?.count ?? 0 },
      { feature: "Notebook (RAG)", uses: (notebookOvRange as any)?.count ?? 0, users: 0, last7d: (notebookOvRange as any)?.count ?? 0 },
      { feature: "Mapa Mental",   uses: ((mindmapsPro as any)?.count ?? 0) + ((mindmapsDoc as any)?.count ?? 0), users: ((mindmapsPro as any)?.users ?? 0) + ((mindmapsDoc as any)?.users ?? 0), last7d: 0 },
      { feature: "Redação",       uses: (redacoesRange as any)?.count ?? 0, users: (redacoesAll as any)?.users ?? 0, last7d: (redacoesRange as any)?.count ?? 0 },
      { feature: "Flashcards",    uses: (flashRevRange as any)?.count ?? 0, users: 0, last7d: (flashRevRange as any)?.count ?? 0 },
    ],
    // _DUMMY_API_KEY_ = Replit proxy integration IS connected (proxy handles auth transparently)
    // Only truly missing (NOT SET) = PENDENTE
    aiProviders: (() => {
      const hasIntegration = (integrationVar: string, directVar?: string) => {
        const iv = process.env[integrationVar];
        if (iv && iv.length > 0) return true;          // set (even dummy = proxy is active)
        if (directVar) return !!process.env[directVar]; // fallback to direct API key
        return false;
      };
      return [
        { id: "deepseek",   ok: !!process.env.DEEPSEEK_API_KEY },
        { id: "anthropic",  ok: hasIntegration("AI_INTEGRATIONS_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY") },
        { id: "openai",     ok: hasIntegration("AI_INTEGRATIONS_OPENAI_API_KEY",     "OPENAI_API_KEY") },
        { id: "gemini",     ok: hasIntegration("AI_INTEGRATIONS_GEMINI_API_KEY",     "GEMINI_API_KEY") },
        { id: "openrouter", ok: hasIntegration("AI_INTEGRATIONS_OPENROUTER_API_KEY", "OPENROUTER_API_KEY") },
        { id: "elevenlabs", ok: !!process.env.ELEVENLABS_API_KEY },
      ];
    })(),
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
      // Range-based (respects dateRange filter)
      rangeUsd: costRangeUsd,
      rangeBrl: costRangeUsd * USD_TO_BRL,
      prevRangeUsd: costPrevUsd,
      prevRangeBrl: costPrevUsd * USD_TO_BRL,
      costPct: pct(costRangeUsd, costPrevUsd),
      callsRange: (aiCostRange as any)?.calls ?? 0,
      tokensRange: (aiCostRange as any)?.tokens ?? 0,
      // Fixed-period (today / this month) — always shown
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

// ─── Medidor de Fontes de Conhecimento — consumo + economia ──────────────────
router.get("/admin/fonte-consumo", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }

  const FREE_MODELS = ["wikipedia-api", "bncc-local", "fts-kb", "exatas-kb", "cache-semantic"];
  const FREE_SAVED: Record<string, number> = {
    "wikipedia-api": 0.00018,
    "bncc-local":    0.000075,
    "fts-kb":        0.000225,
    "exatas-kb":     0.000300, // ~500 tokens de fórmulas curadas por chamada
  };
  const USD_TO_BRL = 5.70;

  try {
    const { pool } = await import("@workspace/db");

    // ── IA Paga: custo e chamadas reais ──────────────────────────────────────
    const iaRes = await pool.query(`
      SELECT
        model,
        COUNT(*)::int                            AS calls,
        COALESCE(SUM(cost_usd::numeric), 0)::float AS cost_usd,
        COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS tokens
      FROM ai_cost_log
      WHERE model NOT IN (${FREE_MODELS.map((_, i) => `$${i + 1}`).join(",")})
      GROUP BY model
      ORDER BY cost_usd DESC
    `, FREE_MODELS);

    const iaTotals = await pool.query(`
      SELECT
        COUNT(*)::int                            AS total_calls,
        COALESCE(SUM(cost_usd::numeric), 0)::float AS total_cost,
        COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS total_tokens
      FROM ai_cost_log
      WHERE model NOT IN (${FREE_MODELS.map((_, i) => `$${i + 1}`).join(",")})
    `, FREE_MODELS);

    // ── Fontes Gratuitas: chamadas por modelo ────────────────────────────────
    const freeRes = await pool.query(`
      SELECT
        model,
        COUNT(*)::int                            AS calls,
        COALESCE(SUM(tokens_out), 0)::int        AS tokens_out
      FROM ai_cost_log
      WHERE model IN (${FREE_MODELS.map((_, i) => `$${i + 1}`).join(",")})
      GROUP BY model
    `, FREE_MODELS);

    // ── Cache Semântico ──────────────────────────────────────────────────────
    const cacheRes = await pool.query(`
      SELECT
        feature,
        COUNT(*)::int                             AS entries,
        COALESCE(SUM(uso_count), 0)::int          AS hits
      FROM ai_response_cache
      GROUP BY feature
      ORDER BY hits DESC
    `);

    const cacheTotals = await pool.query(`
      SELECT
        COUNT(*)::int                             AS total_entries,
        COALESCE(SUM(uso_count), 0)::int          AS total_hits
      FROM ai_response_cache
    `);

    // ── Calcula economias ────────────────────────────────────────────────────
    const ia = iaTotals.rows[0] as any;
    const totalIaCalls  = Number(ia?.total_calls  ?? 0);
    const totalIaCost   = Number(ia?.total_cost   ?? 0);
    const avgCostPerIaCall = totalIaCalls > 0 ? totalIaCost / totalIaCalls : 0;

    const cacheTotal = cacheTotals.rows[0] as any;
    const cacheHits    = Number(cacheTotal?.total_hits    ?? 0);
    const cacheSavedUsd = cacheHits * avgCostPerIaCall;

    // Savings from each free source
    const freeByModel: Record<string, number> = {};
    for (const row of freeRes.rows as any[]) {
      freeByModel[row.model] = Number(row.calls);
    }

    const wikiCalls   = freeByModel["wikipedia-api"] ?? 0;
    const bnccCalls   = freeByModel["bncc-local"]    ?? 0;
    const ftsCalls    = freeByModel["fts-kb"]        ?? 0;
    const exatasCalls = freeByModel["exatas-kb"]     ?? 0;

    const wikiSaved   = wikiCalls   * FREE_SAVED["wikipedia-api"];
    const bnccSaved   = bnccCalls   * FREE_SAVED["bncc-local"];
    const ftsSaved    = ftsCalls    * FREE_SAVED["fts-kb"];
    const exatasSaved = exatasCalls * FREE_SAVED["exatas-kb"];
    const totalSavedUsd = cacheSavedUsd + wikiSaved + bnccSaved + ftsSaved + exatasSaved;

    const taxaEconomia = (totalIaCost + totalSavedUsd) > 0
      ? Math.round((totalSavedUsd / (totalIaCost + totalSavedUsd)) * 100)
      : 0;

    res.json({
      ia: {
        totalCalls:  totalIaCalls,
        totalCostUsd: totalIaCost,
        totalCostBrl: totalIaCost * USD_TO_BRL,
        byModel: (iaRes.rows as any[]).map(r => ({
          model: r.model,
          calls: Number(r.calls),
          costUsd: Number(r.cost_usd),
          costBrl: Number(r.cost_usd) * USD_TO_BRL,
          tokens: Number(r.tokens),
        })),
      },
      cache: {
        totalEntries: Number(cacheTotal?.total_entries ?? 0),
        totalHits:    cacheHits,
        savedUsd:     cacheSavedUsd,
        savedBrl:     cacheSavedUsd * USD_TO_BRL,
        avgCostPerIaCall,
        byFeature: (cacheRes.rows as any[]).map(r => ({
          feature: r.feature,
          entries: Number(r.entries),
          hits:    Number(r.hits),
        })),
      },
      fontes: [
        {
          id: "ia-paga", nome: "IA Paga (OpenAI / Claude)", tipo: "ia",
          calls: totalIaCalls, costUsd: totalIaCost, costBrl: totalIaCost * USD_TO_BRL,
          savedUsd: 0, savedBrl: 0, cor: "#3b82f6", emoji: "🤖",
          descricao: "Chamadas reais aos modelos GPT-4o-mini, Claude, Gemini",
        },
        {
          id: "cache", nome: "Cache Semântico", tipo: "cache",
          calls: cacheHits, costUsd: 0, costBrl: 0,
          savedUsd: cacheSavedUsd, savedBrl: cacheSavedUsd * USD_TO_BRL,
          cor: "#10b981", emoji: "⚡",
          descricao: "Respostas reutilizadas por similaridade vetorial (pgvector)",
        },
        {
          id: "wikipedia", nome: "Wikipedia PT", tipo: "free-api",
          calls: wikiCalls, costUsd: 0, costBrl: 0,
          savedUsd: wikiSaved, savedBrl: wikiSaved * USD_TO_BRL,
          cor: "#06b6d4", emoji: "🌐",
          descricao: "API pública do Wikipedia em português — zero custo",
        },
        {
          id: "bncc", nome: "BNCC Local (MEC)", tipo: "free-local",
          calls: bnccCalls, costUsd: 0, costBrl: 0,
          savedUsd: bnccSaved, savedBrl: bnccSaved * USD_TO_BRL,
          cor: "#8b5cf6", emoji: "📚",
          descricao: "Base Nacional Comum Curricular em memória — sem latência",
        },
        {
          id: "fts-kb", nome: "Base de Conhecimento (FTS)", tipo: "free-local",
          calls: ftsCalls, costUsd: 0, costBrl: 0,
          savedUsd: ftsSaved, savedBrl: ftsSaved * USD_TO_BRL,
          cor: "#f59e0b", emoji: "🗄️",
          descricao: "Busca em texto completo no banco de dados local (PostgreSQL)",
        },
        {
          id: "exatas-kb", nome: "Banco de Fórmulas Exatas", tipo: "free-local",
          calls: exatasCalls, costUsd: 0, costBrl: 0,
          savedUsd: exatasSaved, savedBrl: exatasSaved * USD_TO_BRL,
          cor: "#ef4444", emoji: "📐",
          descricao: "Banco curado de fórmulas ENEM — Matemática, Física e Química (in-memory)",
        },
      ],
      totalSavedUsd,
      totalSavedBrl: totalSavedUsd * USD_TO_BRL,
      totalIaCostUsd: totalIaCost,
      totalIaCostBrl: totalIaCost * USD_TO_BRL,
      taxaEconomia,
    });
  } catch (err) {
    console.error("[admin/fonte-consumo]", err);
    res.status(500).json({ erro: "Erro ao calcular fontes de consumo" });
  }
});

// ─── Cache Semântico — estatísticas ──────────────────────────────────────────
router.get("/admin/cache/stats", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  const stats = await cacheStats();
  res.json(stats);
});

router.delete("/admin/cache/clear", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  const { feature } = req.body as { feature?: string };
  try {
    const { pool } = await import("@workspace/db");
    if (feature) {
      await pool.query(`DELETE FROM ai_response_cache WHERE feature = $1`, [feature]);
      res.json({ ok: true, mensagem: `Cache '${feature}' limpo.` });
    } else {
      await pool.query(`DELETE FROM ai_response_cache`);
      res.json({ ok: true, mensagem: "Cache completo limpo." });
    }
  } catch (err) {
    res.status(500).json({ erro: (err as Error).message });
  }
});

// ─── Memória Generativa — visualização e estatísticas ────────────────────────
router.get("/admin/memoria-generativa", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  try {
    const { pool } = await import("@workspace/db");

    // Stats gerais
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) as total_perfis,
        COUNT(CASE WHEN jsonb_array_length(ultimas_sessoes::jsonb) > 0 THEN 1 END) as com_sessoes,
        COUNT(CASE WHEN jsonb_array_length(topicos_frequentes::jsonb) > 0 THEN 1 END) as com_topicos,
        AVG(jsonb_array_length(ultimas_sessoes::jsonb)) as media_sessoes,
        AVG(jsonb_array_length(topicos_frequentes::jsonb)) as media_topicos,
        MAX(atualizado_at) as ultima_atualizacao
      FROM user_profile_memory
    `);
    const stats = statsRes.rows[0];

    // Top tópicos mais estudados na plataforma (cross-user)
    const topTopicsRes = await pool.query(`
      SELECT
        t->>'topico' as topico,
        t->>'materia' as materia,
        SUM((t->>'count')::int) as total_acessos
      FROM user_profile_memory,
        jsonb_array_elements(topicos_frequentes::jsonb) as t
      GROUP BY t->>'topico', t->>'materia'
      ORDER BY total_acessos DESC
      LIMIT 20
    `);

    // Legacy tiagao_memory count
    const legacyRes = await pool.query(`
      SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as usuarios
      FROM tiagao_memory
    `);

    res.json({
      perfisAtivos: Number(stats.total_perfis),
      perfisComSessoes: Number(stats.com_sessoes),
      perfisComTopicos: Number(stats.com_topicos),
      mediasSessoesPorPerfil: parseFloat(stats.media_sessoes ?? "0").toFixed(1),
      mediaTopicosPorPerfil: parseFloat(stats.media_topicos ?? "0").toFixed(1),
      ultimaAtualizacao: stats.ultima_atualizacao,
      topTopicosPlataforma: topTopicsRes.rows,
      memoriasLegacy: {
        total: Number(legacyRes.rows[0]?.total ?? 0),
        usuarios: Number(legacyRes.rows[0]?.usuarios ?? 0),
      },
    });
  } catch (err) {
    console.error("[admin/memoria-generativa]", err);
    res.status(500).json({ erro: (err as Error).message });
  }
});

router.get("/admin/memoria-generativa/:userId", async (req: Request, res: Response) => {
  if (!await isAdminUserAsync(req.userId)) {
    res.status(403).json({ erro: "Acesso negado" });
    return;
  }
  try {
    const { userId } = req.params;
    const { pool } = await import("@workspace/db");

    const profileRes = await pool.query(
      `SELECT * FROM user_profile_memory WHERE user_id = $1`,
      [userId]
    );
    const legacyRes = await pool.query(
      `SELECT memoria, categoria, importancia, atualizado_at FROM tiagao_memory WHERE user_id = $1 ORDER BY importancia DESC LIMIT 30`,
      [userId]
    );

    const contextBlock = await getFullMemoryContext(String(userId), "Usuário");

    res.json({
      perfil: profileRes.rows[0] ?? null,
      memoriasLegacy: legacyRes.rows,
      blocoContexto: contextBlock,
    });
  } catch (err) {
    res.status(500).json({ erro: (err as Error).message });
  }
});

export default router;
