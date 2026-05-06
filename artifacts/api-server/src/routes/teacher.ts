import { Router, type IRouter, type Request, type Response } from "express";
import { openai, OR } from "../lib/aiClient";
import { claudeJson, claudeChat, CLAUDE_OPUS, CLAUDE_SONNET } from "../lib/claudeAi";
import { db } from "@workspace/db";
import {
  usersTable, turmasTable, turmaMembershipsTable, turmaTarefasTable,
  simuladoResultsTable, flashcardSessionsTable, userActivityTable,
  questionBankTable, activitiesTable, activitySubmissionsTable, redacoesTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray, gte } from "drizzle-orm";
import { roleRequestsTable } from "@workspace/db/schema";
import { isAdminUser, isAdminUserAsync } from "../lib/adminCheck";
import { saveGeneratedContent } from "../lib/contentHistory";
import { claudeText } from "../lib/claudeAi";
import { MATERIAL_HTML_INSTRUCTIONS, wrapMaterialHTML } from "../lib/material-template";
import { selectMaterialStyle, buildStyleInstructions, buildStyleOverrideCSS } from "../lib/material-style";
import { recordStyleEvent, getUserStyleBias, type StyleAction } from "../lib/material-style-learning";

const router: IRouter = Router();

// Helper: check teacher/admin role
async function isTeacherOrAdmin(userId: string): Promise<boolean> {
  const user = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const role = user[0]?.role ?? "student";
  return ["teacher", "institution_admin", "admin"].includes(role);
}

// Generate 6-char invite code
function genInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── List teacher's turmas ────────────────────────────────────────────────────
router.get("/teacher/turmas", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const turmas = await db
    .select()
    .from(turmasTable)
    .where(eq(turmasTable.teacherId, req.userId!))
    .orderBy(desc(turmasTable.createdAt));

  // Get student counts
  const turmaIds = turmas.map(t => t.id);
  let counts: { turmaId: string; count: number }[] = [];
  if (turmaIds.length > 0) {
    const raw = await db
      .select({ turmaId: turmaMembershipsTable.turmaId, count: sql<number>`count(*)::int` })
      .from(turmaMembershipsTable)
      .where(inArray(turmaMembershipsTable.turmaId, turmaIds))
      .groupBy(turmaMembershipsTable.turmaId);
    counts = raw;
  }

  const countMap = Object.fromEntries(counts.map(c => [c.turmaId, c.count]));
  const result = turmas.map(t => ({ ...t, studentCount: countMap[t.id] ?? 0 }));
  res.json({ turmas: result });
});

// ─── Create turma ─────────────────────────────────────────────────────────────
router.post("/teacher/turmas", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { name, serie, subject, description } = req.body as {
    name?: string; serie?: string; subject?: string; description?: string;
  };
  if (!name?.trim()) { res.status(400).json({ error: "Nome da turma é obrigatório" }); return; }

  // Ensure unique invite code
  let inviteCode = genInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db.select({ id: turmasTable.id }).from(turmasTable).where(eq(turmasTable.inviteCode, inviteCode)).limit(1);
    if (!exists.length) break;
    inviteCode = genInviteCode();
  }

  const [turma] = await db.insert(turmasTable).values({
    teacherId: req.userId!,
    name: name.trim(),
    serie: serie?.trim() || null,
    subject: subject?.trim() || null,
    description: description?.trim() || null,
    inviteCode,
  }).returning();

  res.json({ turma });
});

// ─── Get turma detail ─────────────────────────────────────────────────────────
router.get("/teacher/turmas/:id", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const id = String(String(req.params.id));
  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
  if (!turma || (turma.teacherId !== req.userId! && !isAdminUser(req.userId))) {
    res.status(404).json({ error: "Turma não encontrada" }); return;
  }

  res.json({ turma });
});

// ─── Update turma ─────────────────────────────────────────────────────────────
router.put("/teacher/turmas/:id", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = String(String(req.params.id));
  const { name, serie, subject, description } = req.body as any;

  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
  if (!turma || turma.teacherId !== req.userId!) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  const [updated] = await db.update(turmasTable).set({
    name: name?.trim() || turma.name,
    serie: serie?.trim() ?? turma.serie,
    subject: subject?.trim() ?? turma.subject,
    description: description?.trim() ?? turma.description,
  }).where(eq(turmasTable.id, id)).returning();

  res.json({ turma: updated });
});

// ─── Delete turma ─────────────────────────────────────────────────────────────
router.delete("/teacher/turmas/:id", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = String(String(req.params.id));
  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
  if (!turma || turma.teacherId !== req.userId!) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  await db.delete(turmasTable).where(eq(turmasTable.id, id));
  res.json({ success: true });
});

// ─── Join turma (student) ─────────────────────────────────────────────────────
router.post("/teacher/turmas/join", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { inviteCode } = req.body as { inviteCode?: string };
  if (!inviteCode?.trim()) { res.status(400).json({ error: "Código de convite é obrigatório" }); return; }

  const [turma] = await db.select().from(turmasTable).where(
    and(eq(turmasTable.inviteCode, inviteCode.trim().toUpperCase()), eq(turmasTable.isActive, true))
  ).limit(1);

  if (!turma) { res.status(404).json({ error: "Código de convite inválido ou turma inativa" }); return; }

  // Check if already enrolled
  const existing = await db.select().from(turmaMembershipsTable).where(
    and(eq(turmaMembershipsTable.turmaId, turma.id), eq(turmaMembershipsTable.studentId, req.userId!))
  ).limit(1);
  if (existing.length) { res.status(400).json({ error: "Você já está nessa turma" }); return; }

  await db.insert(turmaMembershipsTable).values({ turmaId: turma.id, studentId: req.userId! });
  res.json({ success: true, turma: { id: turma.id, name: turma.name } });
});

// ─── Get turma students with stats ───────────────────────────────────────────
router.get("/teacher/turmas/:id/students", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const id = String(String(req.params.id));
  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
  if (!turma || (turma.teacherId !== req.userId! && !isAdminUser(req.userId))) {
    res.status(404).json({ error: "Turma não encontrada" }); return;
  }

  const memberships = await db
    .select({ studentId: turmaMembershipsTable.studentId, joinedAt: turmaMembershipsTable.joinedAt })
    .from(turmaMembershipsTable)
    .where(eq(turmaMembershipsTable.turmaId, id));

  if (!memberships.length) { res.json({ students: [] }); return; }

  const studentIds = memberships.map(m => m.studentId);

  // Fetch user info + XP
  const users = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    email: usersTable.email,
    xp: usersTable.xp,
    studentName: usersTable.studentName,
    studentGrade: usersTable.studentGrade,
    studentPhone: usersTable.studentPhone,
  }).from(usersTable).where(inArray(usersTable.id, studentIds));

  // Fetch simulado count + avg accuracy per student
  const simStats = await db.select({
    userId: simuladoResultsTable.userId,
    simCount: sql<number>`count(*)::int`,
    avgScore: sql<number>`avg(${simuladoResultsTable.score}::float / nullif(${simuladoResultsTable.total}, 0) * 100)`,
  }).from(simuladoResultsTable)
    .where(inArray(simuladoResultsTable.userId, studentIds))
    .groupBy(simuladoResultsTable.userId);

  // Fetch streak (last 7 days activity)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activityRaw = await db.select({
    userId: userActivityTable.userId,
    days: sql<number>`count(distinct ${userActivityTable.studyDate})::int`,
  }).from(userActivityTable)
    .where(and(inArray(userActivityTable.userId, studentIds), sql`${userActivityTable.createdAt} > ${sevenDaysAgo}`))
    .groupBy(userActivityTable.userId);

  const simMap = Object.fromEntries(simStats.map(s => [s.userId, s]));
  const actMap = Object.fromEntries(activityRaw.map(a => [a.userId, a.days]));
  const joinMap = Object.fromEntries(memberships.map(m => [m.studentId, m.joinedAt]));

  const students = users.map(u => {
    const sim = simMap[u.id];
    const xp = u.xp ?? 0;
    const simCount = sim?.simCount ?? 0;
    const avgAccuracy = sim ? Math.round(sim.avgScore ?? 0) : 0;
    const activeDays = actMap[u.id] ?? 0;
    const status = xp < 50 && simCount === 0 ? "risco" : xp < 200 ? "iniciante" : activeDays >= 4 ? "destaque" : "ativo";

    return {
      id: u.id,
      name: u.studentName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Aluno",
      email: u.email,
      phone: u.studentPhone ?? null,
      xp,
      simCount,
      avgAccuracy,
      activeDays,
      status,
      grade: u.studentGrade,
      joinedAt: joinMap[u.id],
    };
  }).sort((a, b) => b.xp - a.xp);

  res.json({ students, total: students.length });
});

// ─── Kick student from turma ──────────────────────────────────────────────────
router.delete("/teacher/turmas/:id/students/:studentId", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = String(req.params.id);
  const studentId = String(req.params.studentId);
  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
  if (!turma || turma.teacherId !== req.userId!) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  await db.delete(turmaMembershipsTable).where(
    and(eq(turmaMembershipsTable.turmaId, id), eq(turmaMembershipsTable.studentId, studentId))
  );
  res.json({ success: true });
});

// ─── Turma tasks CRUD ─────────────────────────────────────────────────────────
// IDOR-safe helper: ensure caller owns turma or is admin (DB or env-based)
async function assertTurmaAccess(turmaId: string, userId: string): Promise<boolean> {
  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, turmaId)).limit(1);
  if (!turma) return false;
  if (turma.teacherId === userId) return true;
  return await isAdminUserAsync(userId);
}

router.get("/teacher/turmas/:id/tasks", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = String(req.params.id);
  if (!(await assertTurmaAccess(id, req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  const tasks = await db.select().from(turmaTarefasTable)
    .where(eq(turmaTarefasTable.turmaId, id))
    .orderBy(desc(turmaTarefasTable.createdAt));
  res.json({ tasks });
});

router.post("/teacher/turmas/:id/tasks", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  const id = String(req.params.id);
  if (!(await assertTurmaAccess(id, req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  const { type, title, description, materia, dueDate } = req.body as any;
  if (!type || !title) { res.status(400).json({ error: "type e title são obrigatórios" }); return; }

  const [task] = await db.insert(turmaTarefasTable).values({
    turmaId: id,
    type,
    title,
    description: description || null,
    materia: materia || null,
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();

  res.json({ task });
});

router.delete("/teacher/turmas/:id/tasks/:taskId", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = String(req.params.id);
  if (!(await assertTurmaAccess(id, req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  await db.delete(turmaTarefasTable).where(
    and(eq(turmaTarefasTable.id, String(req.params.taskId)), eq(turmaTarefasTable.turmaId, id))
  );
  res.json({ success: true });
});

// ─── Turma dashboard aggregate ────────────────────────────────────────────────
router.get("/teacher/turmas/:id/dashboard", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  const id = String(req.params.id);
  if (!(await assertTurmaAccess(id, req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  const memberships = await db
    .select({ studentId: turmaMembershipsTable.studentId })
    .from(turmaMembershipsTable)
    .where(eq(turmaMembershipsTable.turmaId, id));

  const studentIds = memberships.map(m => m.studentId);
  if (!studentIds.length) {
    res.json({ totalStudents: 0, avgXp: 0, atRisk: 0, topStudent: null, engagementRate: 0, simCompleted: 0 });
    return;
  }

  const users = await db.select({ id: usersTable.id, xp: usersTable.xp, studentName: usersTable.studentName, firstName: usersTable.firstName })
    .from(usersTable).where(inArray(usersTable.id, studentIds));

  const xps = users.map(u => u.xp ?? 0);
  const avgXp = xps.length ? Math.round(xps.reduce((a, b) => a + b, 0) / xps.length) : 0;
  const atRisk = users.filter(u => (u.xp ?? 0) < 50).length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const activeStudents = await db.select({ userId: userActivityTable.userId })
    .from(userActivityTable)
    .where(and(inArray(userActivityTable.userId, studentIds), sql`${userActivityTable.createdAt} > ${sevenDaysAgo}`))
    .groupBy(userActivityTable.userId);

  const simStats = await db.select({ count: sql<number>`count(*)::int` })
    .from(simuladoResultsTable)
    .where(inArray(simuladoResultsTable.userId, studentIds));

  const topStudent = users.sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))[0];
  const topName = topStudent ? (topStudent.studentName || topStudent.firstName || "Aluno") : null;

  res.json({
    totalStudents: studentIds.length,
    avgXp,
    atRisk,
    topStudent: topName,
    engagementRate: studentIds.length ? Math.round((activeStudents.length / studentIds.length) * 100) : 0,
    simCompleted: simStats[0]?.count ?? 0,
  });
});

// ─── Turma ranking ────────────────────────────────────────────────────────────
router.get("/teacher/turmas/:id/ranking", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  const id = String(req.params.id);
  if (!(await assertTurmaAccess(id, req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  const memberships = await db.select({ studentId: turmaMembershipsTable.studentId })
    .from(turmaMembershipsTable).where(eq(turmaMembershipsTable.turmaId, id));

  const studentIds = memberships.map(m => m.studentId);
  if (!studentIds.length) { res.json({ ranking: [] }); return; }

  const users = await db.select({
    id: usersTable.id, xp: usersTable.xp,
    studentName: usersTable.studentName, firstName: usersTable.firstName, lastName: usersTable.lastName,
  }).from(usersTable).where(inArray(usersTable.id, studentIds));

  const ranking = users
    .sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))
    .map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.studentName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Aluno",
      xp: u.xp ?? 0,
      isMe: u.id === req.userId!,
    }));

  res.json({ ranking });
});

// ─── Get teacher's turmas (for student joining) ───────────────────────────────
router.get("/turma/my", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const memberships = await db
    .select({ turmaId: turmaMembershipsTable.turmaId })
    .from(turmaMembershipsTable)
    .where(eq(turmaMembershipsTable.studentId, req.userId!));

  if (!memberships.length) { res.json({ turmas: [] }); return; }
  const turmaIds = memberships.map(m => m.turmaId);
  const turmas = await db.select({
    id: turmasTable.id, name: turmasTable.name,
    serie: turmasTable.serie, subject: turmasTable.subject,
    teacherId: turmasTable.teacherId,
  }).from(turmasTable).where(inArray(turmasTable.id, turmaIds));

  res.json({ turmas });
});

// ─── Request teacher access ───────────────────────────────────────────────────
router.post("/teacher/request-access", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { school, subject, message } = req.body as { school?: string; subject?: string; message?: string };
  if (!school || !subject) { res.status(400).json({ error: "Escola e disciplina são obrigatórios" }); return; }

  try {
    // Check for existing pending request
    const existing = await db.select({ id: roleRequestsTable.id })
      .from(roleRequestsTable)
      .where(and(eq(roleRequestsTable.userId, req.userId), eq(roleRequestsTable.requestedRole, "teacher"), eq(roleRequestsTable.status, "pending")))
      .limit(1);
    if (existing.length > 0) {
      res.json({ success: true, message: "Você já tem uma solicitação pendente." });
      return;
    }
    await db.insert(roleRequestsTable).values({ userId: req.userId, requestedRole: "teacher", school, subject, message: message ?? null });
    res.json({ success: true, message: "Solicitação recebida. O administrador irá revisar em breve." });
  } catch (err) {
    req.log.error({ err }, "Error processing teacher access request");
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

// ─── Global teacher dashboard stats ──────────────────────────────────────────
router.get("/teacher/dashboard", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  try {
    // All this teacher's turmas
    const turmas = await db.select({ id: turmasTable.id, name: turmasTable.name, serie: turmasTable.serie, subject: turmasTable.subject })
      .from(turmasTable).where(eq(turmasTable.teacherId, req.userId!));

    const turmaIds = turmas.map(t => t.id);

    // Student counts per turma
    let memberships: { turmaId: string; studentId: string }[] = [];
    if (turmaIds.length) {
      memberships = await db.select({ turmaId: turmaMembershipsTable.turmaId, studentId: turmaMembershipsTable.studentId })
        .from(turmaMembershipsTable).where(inArray(turmaMembershipsTable.turmaId, turmaIds));
    }
    const studentIds = [...new Set(memberships.map(m => m.studentId))];
    const totalStudents = studentIds.length;
    const countMap: Record<string, number> = {};
    memberships.forEach(m => { countMap[m.turmaId] = (countMap[m.turmaId] ?? 0) + 1; });

    // Simulado stats
    let simStats: { userId: string; score: number; total: number; materia: string | null; createdAt: Date }[] = [];
    if (studentIds.length) {
      simStats = await db.select({
        userId: simuladoResultsTable.userId,
        score: simuladoResultsTable.score,
        total: simuladoResultsTable.total,
        materia: simuladoResultsTable.materia,
        createdAt: simuladoResultsTable.createdAt,
      }).from(simuladoResultsTable).where(inArray(simuladoResultsTable.userId, studentIds));
    }

    const avgPerformance = simStats.length
      ? Math.round(simStats.reduce((s, r) => s + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) / simStats.length)
      : 0;

    // Weekly chart — last 7 weeks
    const weeks = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i) * 7);
      const label = `Sem${i + 1}`;
      return { label, start: new Date(d.getTime() - 7 * 24 * 3600 * 1000), end: d };
    });
    const weeklyChart = weeks.map(w => {
      const inWindow = simStats.filter(s => new Date(s.createdAt) >= w.start && new Date(s.createdAt) < w.end);
      const acertos = inWindow.length ? Math.round(inWindow.reduce((s, r) => s + (r.total > 0 ? (r.score / r.total) * 100 : 0), 0) / inWindow.length) : 0;
      const erros = 100 - acertos;
      const participacao = Math.min(100, inWindow.length * 5);
      return { week: w.label, acertos, erros, participacao };
    });

    // Heat map by materia
    const materiaMap: Record<string, { total: number; count: number }> = {};
    simStats.forEach(s => {
      const m = s.materia || "Geral";
      if (!materiaMap[m]) materiaMap[m] = { total: 0, count: 0 };
      materiaMap[m].total += s.total > 0 ? (s.score / s.total) * 100 : 0;
      materiaMap[m].count++;
    });
    const heatMap = Object.entries(materiaMap).map(([materia, v]) => ({
      materia, score: Math.round(v.total / v.count),
    })).sort((a, b) => a.score - b.score);

    // Engagement: students active in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    let activeCount = 0;
    if (studentIds.length) {
      const active = await db.select({ userId: userActivityTable.userId })
        .from(userActivityTable)
        .where(and(inArray(userActivityTable.userId, studentIds), gte(userActivityTable.createdAt, sevenDaysAgo)))
        .groupBy(userActivityTable.userId);
      activeCount = active.length;
    }
    const engagementRate = totalStudents ? Math.round((activeCount / totalStudents) * 100) : 0;

    // Alerts
    const alerts: { type: string; text: string; severity: string }[] = [];
    if (studentIds.length) {
      // Students not active in 7 days
      const activeIds = new Set(
        (await db.select({ userId: userActivityTable.userId })
          .from(userActivityTable)
          .where(and(inArray(userActivityTable.userId, studentIds), gte(userActivityTable.createdAt, sevenDaysAgo)))
          .groupBy(userActivityTable.userId)
        ).map(a => a.userId)
      );
      const inactive = studentIds.filter(id => !activeIds.has(id)).length;
      if (inactive > 0) alerts.push({ type: "inactivity", text: `${inactive} aluno${inactive > 1 ? "s" : ""} sem acesso há mais de 7 dias.`, severity: "warning" });

      // Materias with low performance
      const lowMaterias = heatMap.filter(h => h.score < 50);
      if (lowMaterias.length) alerts.push({ type: "performance", text: `Turma com dificuldade em: ${lowMaterias.map(h => h.materia).slice(0, 3).join(", ")}.`, severity: "warning" });
    }
    if (!alerts.length) alerts.push({ type: "ok", text: "Turma com bom desempenho geral! Continue assim.", severity: "info" });

    // Students list
    let students: any[] = [];
    if (studentIds.length) {
      const users = await db.select({ id: usersTable.id, studentName: usersTable.studentName, firstName: usersTable.firstName, lastName: usersTable.lastName, xp: usersTable.xp, createdAt: usersTable.createdAt })
        .from(usersTable).where(inArray(usersTable.id, studentIds));

      const simByUser = simStats.reduce<Record<string, { total: number; count: number }>>((acc, s) => {
        if (!acc[s.userId]) acc[s.userId] = { total: 0, count: 0 };
        acc[s.userId].total += s.total > 0 ? (s.score / s.total) * 100 : 0;
        acc[s.userId].count++;
        return acc;
      }, {});

      const memberTurmaMap: Record<string, string> = {};
      memberships.forEach(m => { memberTurmaMap[m.studentId] = turmas.find(t => t.id === m.turmaId)?.name ?? ""; });

      students = users.map(u => {
        const sim = simByUser[u.id];
        const perf = sim ? Math.round(sim.total / sim.count) : 0;
        const isActive = activeCount > 0; // simplified
        return {
          id: u.id,
          name: u.studentName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Aluno",
          turma: memberTurmaMap[u.id] ?? "",
          performance: perf,
          engagement: perf > 70 ? "Alto" : perf > 40 ? "Médio" : "Baixo",
          lastAccess: "Recente",
        };
      }).sort((a, b) => b.performance - a.performance).slice(0, 10);
    }

    res.json({
      totalStudents,
      totalTurmas: turmas.length,
      avgPerformance,
      engagementRate,
      weeklyChart,
      heatMap,
      alerts,
      students,
      turmas: turmas.map(t => ({ ...t, studentCount: countMap[t.id] ?? 0 })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching teacher dashboard");
    res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
});

// ─── AI Exam Generator (upgraded: worldMode, visualStyle, weakness) ───────────
router.post("/teacher/generate-exam", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const {
    tema, materia, nivel, quantidade = 5, estilo = "ENEM",
    worldMode = false, visualStyle = "enem",
    weaknesses = [],
  } = req.body as {
    tema?: string; materia?: string; nivel?: string; quantidade?: number; estilo?: string;
    worldMode?: boolean; visualStyle?: string; weaknesses?: string[];
  };
  if (!tema || !materia) { res.status(400).json({ error: "Tema e matéria são obrigatórios" }); return; }

  try {
    const qtd = Math.min(Math.max(Number(quantidade) || 5, 3), 10);
    const weaknessCtx = weaknesses.length ? `\nFOCO NAS FRAQUEZAS DO ALUNO: Os erros mais comuns são em: ${weaknesses.join(", ")}. Direcione as questões para esses pontos.` : "";

    let systemContent: string;
    let userContent: string;

    if (worldMode) {
      systemContent = `Você é um designer narrativo educacional sênior, autor de jornadas gamificadas para o ensino brasileiro (ENEM, vestibulares, BNCC).
Sua missão: criar uma PROVA MODO MUNDO — uma jornada épica em que cada questão é um desafio dentro de uma narrativa contínua, com personagem guia, cenário vívido e missão clara.

DIRETRIZES EDITORIAIS (obrigatórias):
- O enunciado de cada questão deve ser tecnicamente PRECISO no conteúdo de ${materia} — sem erros conceituais, sem ambiguidade na resposta correta.
- Os "desafios" (campo desafio) costuram a narrativa: usam o cenário, o personagem e a missão para contextualizar o porquê daquele problema agora.
- Use referências culturais brasileiras autênticas (Amazônia, sertão, Pantanal, samba, futebol, jurisprudência STF, Plano Real, biomas, regionalismos), não estereótipos.
- Distratores plausíveis: as 3 alternativas erradas devem refletir confusões comuns reais de alunos brasileiros, não opções absurdas.
- Cada explicação ensina o conceito, não só "porque é a letra X".
- imageDescription em PORTUGUÊS, descrevendo uma ilustração editorial coerente com o universo da jornada.
${weaknessCtx}

Retorne EXCLUSIVAMENTE JSON válido — sem markdown, sem prosa antes ou depois:
{
  "title": "título criativo e memorável da jornada",
  "story": {
    "cenario": "descrição do mundo/universo da missão (2-3 frases vívidas, sensoriais, brasileiras)",
    "missao": "a missão que o jogador precisa cumprir (1-2 frases)",
    "personagem": "nome e descrição curta do personagem guia (1-2 frases)",
    "objetivo": "o objetivo final da jornada",
    "emoji": "emoji temático único"
  },
  "questions": [
    {
      "number": 1,
      "desafio": "como este desafio se conecta à história (1 frase narrativa imersiva)",
      "text": "enunciado da questão em si, completo, autocontido, tecnicamente correto",
      "context": "texto de apoio (pode ser vazio se não necessário)",
      "alternatives": ["A) texto plausível", "B) texto plausível", "C) texto plausível", "D) texto plausível"],
      "correct": 0,
      "explanation": "explicação didática que ensina o conceito (3-5 frases)",
      "imageDescription": "ilustração editorial ideal em português (cena, estilo, atmosfera)"
    }
  ],
  "totalQuestions": ${qtd}
}`;
      userContent = `Crie uma jornada narrativa com ${qtd} desafios de ${materia} sobre "${tema}", nível ${nivel || "médio"}. Contexto pedagógico: ${estilo}. Profundidade técnica obrigatória + narrativa cinematográfica.`;
    } else {
      systemContent = `Você é um autor sênior de provas para o ensino brasileiro, com 20 anos de experiência em ${estilo} e BNCC. Suas questões aparecem em editoras premium (Bernoulli, Anglo, Etapa, Moderna).

PADRÃO DE QUALIDADE OBRIGATÓRIO:
- Contextualização real e brasileira: situações concretas, dados verificáveis, gráficos reais, jurisprudência, ciência aplicada ao cotidiano.
- Precisão técnica absoluta: zero erro conceitual, gabarito UNAMBÍGUO, alternativas mutuamente exclusivas.
- Distratores inteligentes: cada alternativa errada modela um erro comum REAL de aluno brasileiro (confusão de conceitos, troca de fórmulas, leitura precipitada).
- Enunciados ricos: o "context" carrega informação relevante (texto, gráfico descrito, dado, citação) que o aluno precisa usar.
- Explicação didática: ensina o conceito em 3-5 frases, justifica a correta E descarta as erradas com base no conteúdo.
- imageDescription em PORTUGUÊS, descrevendo uma ilustração editorial útil (gráfico de função, mapa, diagrama, infográfico).
- PROIBIDO: questões genéricas tipo "qual é a definição de X", clichês ("entre outros", "etc."), exemplos americanos.
${weaknessCtx}

Retorne EXCLUSIVAMENTE JSON válido — sem markdown, sem prosa:
{
  "title": "Prova de ${materia} — ${tema}",
  "questions": [
    {
      "number": 1,
      "text": "enunciado completo, autocontido, tecnicamente preciso",
      "context": "texto de apoio rico (citação, dado, situação) — pode ser vazio só se realmente desnecessário",
      "alternatives": ["A) texto plausível", "B) texto plausível", "C) texto plausível", "D) texto plausível"],
      "correct": 0,
      "explanation": "explicação didática que ensina o conceito (3-5 frases)",
      "imageDescription": "ilustração editorial ideal em português"
    }
  ],
  "totalQuestions": ${qtd}
}`;
      userContent = `Crie ${qtd} questões de ${materia} sobre "${tema}", nível ${nivel || "médio"}, estilo ${estilo}. Contextualização brasileira obrigatória. Profundidade de editora premium.`;
    }

    const parsed = await claudeJson<any>({
      system: systemContent,
      user: userContent,
      primary: CLAUDE_OPUS,
      fallback: CLAUDE_SONNET,
      maxTokens: 8192,
    });
    saveGeneratedContent({
      ownerId: req.userId!, ownerRole: "teacher",
      kind: "exam",
      title: parsed?.title || `Prova — ${tema}`,
      materia: materia ?? null,
      payload: { exam: parsed, worldMode, visualStyle, tema, materia, nivel, estilo },
    }).catch(() => {});
    res.json({ ok: true, exam: parsed, worldMode, visualStyle });
  } catch (err) {
    req.log.error({ err }, "Error generating exam");
    res.status(500).json({ error: "Erro ao gerar prova" });
  }
});

// ─── Content Creator (NotebookLM style) ──────────────────────────────────────
router.post("/teacher/create-content", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { topico, nivel = "Ensino Médio", tipo = "aula", conteudo = "" } = req.body as {
    topico?: string; nivel?: string; tipo?: string; conteudo?: string;
  };
  if (!topico?.trim()) { res.status(400).json({ error: "Tópico é obrigatório" }); return; }

  try {
    const inputCtx = conteudo.trim() ? `\nCONTEÚDO DE REFERÊNCIA FORNECIDO PELO USUÁRIO (use como base autoritativa):\n${conteudo.slice(0, 3000)}` : "";
    const system = `Você é um autor pedagógico sênior brasileiro (editora premium nível Moderna/Saraiva), especialista em ${nivel} e BNCC.
Sua missão: produzir um PACOTE COMPLETO de aprendizagem editorial-grade sobre o tópico — pronto para uso imediato em sala de aula.${inputCtx}

PADRÃO EDITORIAL OBRIGATÓRIO:
- Resumo denso e didático (4-6 parágrafos), NÃO genérico, com vocabulário preciso da disciplina.
- Slides com narrativa coerente: capa → conceito → exemplo brasileiro real → pontos-chave → destaque (cai no ENEM/curiosidade marcante) → quiz aplicado.
- Exemplos sempre brasileiros e concretos (ex: Rio Tietê para Hidrografia, Lei Maria da Penha para Direitos Humanos, Plano Real para Inflação, Amazônia para Bioma).
- Mind map com profundidade real (3 categorias × 2 conceitos cada, mínimo).
- Questão de quiz tecnicamente precisa, com 4 alternativas plausíveis, gabarito unambíguo, explicação que ensina.
- PROIBIDO: clichês ("entre outros", "etc."), exemplos americanos, generalidades vagas.

Retorne EXCLUSIVAMENTE JSON válido — sem markdown, sem prosa antes ou depois, EXATAMENTE esta estrutura:
{
  "titulo": "título didático do conteúdo",
  "materia": "disciplina principal",
  "resumo": "resumo completo em 4-6 parágrafos explicativos e didáticos",
  "keyPoints": ["ponto importante 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "slides": [
    {"n": 1, "tipo": "titulo", "titulo": "título do slide", "subtitulo": "subtítulo", "emoji": "📐"},
    {"n": 2, "tipo": "conteudo", "titulo": "título", "items": ["item 1", "item 2", "item 3"], "emoji": "📖"},
    {"n": 3, "tipo": "exemplo", "titulo": "Exemplo prático", "texto": "explicação com exemplo real brasileiro", "emoji": "💡"},
    {"n": 4, "tipo": "lista", "titulo": "Pontos-chave", "items": ["item 1", "item 2", "item 3", "item 4"], "emoji": "✅"},
    {"n": 5, "tipo": "destaque", "titulo": "Saiba mais", "texto": "insight importante ou curiosidade marcante", "emoji": "🔥"},
    {"n": 6, "tipo": "quiz", "titulo": "Teste rápido", "pergunta": "questão para verificar compreensão", "emoji": "🎯"}
  ],
  "mindMap": {
    "label": "tópico principal",
    "emoji": "🎯",
    "children": [
      {"label": "subtópico 1", "emoji": "📖", "children": [
        {"label": "conceito A", "emoji": "🔹"},
        {"label": "conceito B", "emoji": "🔹"}
      ]},
      {"label": "subtópico 2", "emoji": "💡", "children": [
        {"label": "conceito C", "emoji": "🔹"},
        {"label": "conceito D", "emoji": "🔹"}
      ]},
      {"label": "subtópico 3", "emoji": "⚡", "children": [
        {"label": "aplicação 1", "emoji": "🔹"},
        {"label": "aplicação 2", "emoji": "🔹"}
      ]}
    ]
  },
  "questions": [
    {"text": "questão completa", "alternatives": ["A) opção", "B) opção", "C) opção", "D) opção"], "correct": 0, "explanation": "explicação da resposta"}
  ]
}`;
    const parsed = await claudeJson<any>({
      system,
      user: `Crie um pacote completo sobre "${topico}" para ${nivel} — tipo: ${tipo}.`,
      primary: CLAUDE_SONNET,
      maxTokens: 6144,
    });
    saveGeneratedContent({
      ownerId: req.userId!, ownerRole: "teacher",
      kind: "content_package",
      title: parsed?.titulo || topico,
      materia: parsed?.materia ?? null,
      payload: { content: parsed, topico, nivel, tipo },
    }).catch(() => {});
    res.json({ ok: true, content: parsed });
  } catch (err) {
    req.log.error({ err }, "Error creating content");
    res.status(500).json({ error: "Erro ao criar conteúdo" });
  }
});

// ─── Material Premium HTML (qualidade visual MiniMax: charts + cards + ícones) ─
router.post("/teacher/material-premium", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { topico, materia = "Geral", nivel = "Ensino Médio", contexto = "", forceThemeId, isRegeneration } = req.body as {
    topico?: string; materia?: string; nivel?: string; contexto?: string;
    forceThemeId?: string; isRegeneration?: boolean;
  };
  if (!topico?.trim()) { res.status(400).json({ error: "Tópico é obrigatório" }); return; }

  try {
    const ctxBlock = contexto.trim()
      ? `\n\nCONTEXTO/REFERÊNCIA do professor (use como base autoritativa):\n${contexto.slice(0, 4000)}`
      : "";

    // ── Carrega bias adaptativo do usuário (não bloqueia se falhar) ──────────
    const userBias = await getUserStyleBias(req.userId!, materia).catch(() => undefined);

    // ── Estética dinâmica: matéria + nível + tópico + APRENDIZADO do usuário ─
    const style = selectMaterialStyle({
      materia, nivel, topico, contexto,
      userBias,
      forceThemeId: forceThemeId as any,
    });
    const styleBlock = buildStyleInstructions(style);
    const overrideCSS = buildStyleOverrideCSS(style);
    req.log.info({
      themeId: style.themeId,
      baseThemeId: style.decision.baseThemeId,
      reason: style.decision.reason,
      density: style.density,
      materia, nivel,
      biasEvents: userBias?.totalEvents ?? 0,
    }, "[material-premium] estilo escolhido (adaptativo)");

    const system = `${styleBlock}

${MATERIAL_HTML_INSTRUCTIONS}

Você está produzindo um MATERIAL DIDÁTICO PREMIUM em HTML para professor brasileiro de ${nivel}.
Tema: "${topico}" — Matéria: ${materia}.${ctxBlock}

Retorne APENAS o conteúdo HTML do <body> (não inclua <html>/<head>/<body>): seções <section id="..."> com cards, listas estilizadas, blocos de exemplo, "Você sabia?", quiz interativo (use as classes do template) e gráficos quando fizer sentido. Use português brasileiro impecável e exemplos concretos do Brasil.`;
    const user = `Gere AGORA o material editorial completo em HTML sobre "${topico}" para ${materia} (${nivel}). Apenas o conteúdo do body, conforme o template e seguindo a ESTÉTICA escolhida (tema "${style.themeName}", densidade ${style.density}, imagens ${style.imageStyle}). Inclua introdução, 3-5 seções de conteúdo profundo, exemplos brasileiros, "Cai no ENEM", quiz interativo e conclusão.`;

    const bodyHtml = await claudeText(CLAUDE_OPUS, system, user, 8192).catch(async () => {
      return claudeText(CLAUDE_SONNET, system, user, 8192);
    });

    const fullHtml = wrapMaterialHTML(`${topico} — ${materia}`, bodyHtml, overrideCSS);

    const id = await saveGeneratedContent({
      ownerId: req.userId!, ownerRole: "teacher",
      kind: "material_premium",
      title: `${topico} — ${materia}`,
      materia,
      payload: {
        html: fullHtml, topico, materia, nivel,
        contexto: contexto ? contexto.slice(0, 500) : "",
        style: {
          themeId: style.themeId, themeName: style.themeName, mode: style.mode,
          density: style.density, imageStyle: style.imageStyle,
          decision: style.decision,
        },
      },
    });

    // ── Registra evento de aprendizado (não bloqueia resposta) ───────────────
    const action: StyleAction = isRegeneration ? "regenerated" : "generated";
    // Se regeração, primeiro penaliza o tema base (que o usuário rejeitou) se diferente do novo
    if (isRegeneration && style.decision.baseThemeId !== style.themeId) {
      void recordStyleEvent({
        userId: req.userId!, themeId: style.decision.baseThemeId,
        action: "regenerated", materia, nivel,
      });
    }
    void recordStyleEvent({
      userId: req.userId!, themeId: style.themeId,
      action, materia, nivel, contentId: id,
    });

    res.json({
      ok: true, id, html: fullHtml,
      style: {
        themeId: style.themeId, themeName: style.themeName,
        baseThemeId: style.decision.baseThemeId, reason: style.decision.reason,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error generating premium material");
    res.status(500).json({ error: "Erro ao gerar material premium" });
  }
});

// ─── Material Premium: feedback explícito (like/dislike/exported/saved) ─────
router.post("/teacher/material-premium/feedback", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { contentId, action, themeId, materia, nivel } = req.body as {
    contentId?: number; action?: StyleAction;
    themeId?: string; materia?: string; nivel?: string;
  };
  const validActions: StyleAction[] = ["liked", "disliked", "exported", "saved", "deleted"];
  if (!action || !validActions.includes(action)) {
    res.status(400).json({ error: "Ação inválida" }); return;
  }
  if (!themeId) { res.status(400).json({ error: "themeId obrigatório" }); return; }

  await recordStyleEvent({
    userId: req.userId!,
    themeId: themeId as any,
    action,
    materia: materia ?? null,
    nivel: nivel ?? null,
    contentId: contentId ?? null,
  });
  res.json({ ok: true });
});

// ─── Material Premium: ver bias atual do usuário (debug/dashboard) ──────────
router.get("/teacher/material-premium/style-bias", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const materia = (req.query.materia as string) || undefined;
  const bias = await getUserStyleBias(req.userId!, materia);
  res.json({ ok: true, bias });
});

// ─── Research / Central de Pesquisa ──────────────────────────────────────────
router.post("/teacher/research", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { query } = req.body as { query?: string };
  if (!query?.trim()) { res.status(400).json({ error: "Query é obrigatória" }); return; }

  try {
    // Fetch from knowledge base first
    let kbContext = "";
    try {
      const { searchKnowledge } = await import("./knowledge");
      const ctx = await searchKnowledge(query, undefined, 5);
      if (ctx) kbContext = `\nCONTEÚDO DA BASE DE CONHECIMENTO DO STUDYAI (priorize):\n${ctx}`;
    } catch { /* non-critical */ }

    const system = `Você é uma enciclopédia educacional brasileira de nível editorial premium, especializada em ENEM, vestibulares (FUVEST, UNICAMP, UFRJ, ITA, IME) e concursos.${kbContext}

PADRÃO DE QUALIDADE:
- Resumo factualmente preciso, denso, com vocabulário técnico correto da disciplina (4-6 parágrafos).
- Slides com narrativa: contexto histórico/científico → exemplo brasileiro real → o que cai no ENEM → curiosidade marcante.
- Mapa mental com profundidade real: 3 categorias × 2+ conceitos cada.
- Questões no estilo ENEM autêntico: contextualizadas, com texto-base/dados, distratores plausíveis.
- Exemplos sempre brasileiros e verificáveis (Plano Real, Lei Maria da Penha, Amazônia, jurisprudência STF, biomas, regionalismos).
- PROIBIDO: clichês, generalidades, exemplos americanos.

Para o tema pesquisado, crie um pacote completo de aprendizagem.
Retorne EXCLUSIVAMENTE JSON válido — sem markdown, sem prosa antes/depois — com esta estrutura:
{
  "titulo": "título do tema",
  "materia": "disciplina",
  "resumo": "resumo completo em 4-6 parágrafos",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "slides": [
    {"n": 1, "tipo": "titulo", "titulo": "título", "subtitulo": "subtítulo", "emoji": "📚"},
    {"n": 2, "tipo": "conteudo", "titulo": "Contexto histórico/científico", "items": ["item 1", "item 2"], "emoji": "🕰️"},
    {"n": 3, "tipo": "exemplo", "titulo": "Exemplo prático", "texto": "exemplo real com contexto brasileiro", "emoji": "💡"},
    {"n": 4, "tipo": "lista", "titulo": "O que cai no ENEM/vestibular", "items": ["tópico 1", "tópico 2", "tópico 3"], "emoji": "🎯"},
    {"n": 5, "tipo": "destaque", "titulo": "Curiosidade", "texto": "fato interessante sobre o tema", "emoji": "🔥"}
  ],
  "mindMap": {
    "label": "tema principal",
    "emoji": "🌟",
    "children": [
      {"label": "aspecto 1", "emoji": "📖", "children": [{"label": "detalhe 1", "emoji": "🔹"}, {"label": "detalhe 2", "emoji": "🔹"}]},
      {"label": "aspecto 2", "emoji": "💡", "children": [{"label": "detalhe 3", "emoji": "🔹"}, {"label": "detalhe 4", "emoji": "🔹"}]},
      {"label": "aspecto 3", "emoji": "⚡", "children": [{"label": "detalhe 5", "emoji": "🔹"}, {"label": "detalhe 6", "emoji": "🔹"}]}
    ]
  },
  "questions": [
    {"text": "questão 1 no estilo ENEM", "alternatives": ["A) opção", "B) opção", "C) opção", "D) opção"], "correct": 0, "explanation": "explicação"},
    {"text": "questão 2", "alternatives": ["A) opção", "B) opção", "C) opção", "D) opção"], "correct": 1, "explanation": "explicação"},
    {"text": "questão 3", "alternatives": ["A) opção", "B) opção", "C) opção", "D) opção"], "correct": 2, "explanation": "explicação"}
  ]
}`;
    const parsed = await claudeJson<any>({
      system,
      user: `Pesquisa: "${query}"`,
      primary: CLAUDE_SONNET,
      maxTokens: 6144,
    });
    saveGeneratedContent({
      ownerId: req.userId!, ownerRole: "teacher",
      kind: "research",
      title: parsed?.titulo || query,
      materia: parsed?.materia ?? null,
      payload: { content: parsed, query, fromKb: !!kbContext },
    }).catch(() => {});
    res.json({ ok: true, content: parsed, fromKb: !!kbContext });
  } catch (err) {
    req.log.error({ err }, "Error in research");
    res.status(500).json({ error: "Erro ao pesquisar" });
  }
});

// ─── Teacher AI Copilot ───────────────────────────────────────────────────────
router.post("/teacher/ai-copilot", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { message, history = [] } = req.body as { message: string; history: { role: string; content: string }[] };
  if (!message?.trim()) { res.status(400).json({ error: "Mensagem é obrigatória" }); return; }

  try {
    const reply = await claudeChat({
      system: `Você é o Copiloto IA do Professor StudyAI — um assistente sênior especializado em ensino brasileiro (ENEM, vestibulares, ensino médio, BNCC).

Sua missão: dar respostas práticas, prontas para uso em sala, com qualidade editorial.

VOCÊ AJUDA O PROFESSOR A:
- Criar aulas, resumos, exercícios e provas
- Gerar explicações claras e tecnicamente corretas para qualquer tema
- Adaptar conteúdo para diferentes níveis (Fundamental II, Médio, Pré-vestibular)
- Analisar desempenho de turmas e propor intervenções pedagógicas
- Criar planos de aula semanais e mensais alinhados à BNCC
- Sugerir estratégias pedagógicas baseadas em evidências

ESTILO DE RESPOSTA:
- Direto, objetivo, organizado em bullets/listas/tabelas Markdown quando ajudar a leitura.
- Exemplos sempre brasileiros e concretos.
- Quando gerar exercícios, inclua gabarito + breve justificativa.
- Quando gerar plano de aula, estruture em: Objetivos → Materiais → Sequência didática → Avaliação.
- Sem rodeios, sem clichês, sem "como IA, posso te ajudar...".`,
      user: message,
      history: history.slice(-10).map((h: any) => ({ role: h.role, content: h.content })),
      primary: CLAUDE_SONNET,
      maxTokens: 2048,
    });
    res.json({ ok: true, reply });
  } catch (err) {
    req.log.error({ err }, "Error in teacher AI copilot");
    res.status(500).json({ error: "Erro ao processar mensagem" });
  }
});

// ─── Banco de Questões ────────────────────────────────────────────────────────
router.get("/teacher/question-bank", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  try {
    const questions = await db.select().from(questionBankTable)
      .where(eq(questionBankTable.teacherId, req.userId!))
      .orderBy(desc(questionBankTable.createdAt)).limit(200);
    res.json({ questions });
  } catch {
    res.status(500).json({ error: "Erro ao buscar banco de questões" });
  }
});

router.post("/teacher/question-bank", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  const { materia, tema, nivel, text, context, alternatives, correct, explanation, imageDescription, tags } = req.body;
  if (!materia || !tema || !text || !alternatives) { res.status(400).json({ error: "Campos obrigatórios ausentes" }); return; }
  try {
    const [q] = await db.insert(questionBankTable).values({
      teacherId: req.userId!, materia, tema, nivel, text, context, alternatives, correct: correct ?? 0, explanation, imageDescription, tags,
    }).returning();
    res.json({ ok: true, question: q });
  } catch {
    res.status(500).json({ error: "Erro ao salvar questão" });
  }
});

router.delete("/teacher/question-bank/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  try {
    await db.delete(questionBankTable)
      .where(and(eq(questionBankTable.id, String(req.params.id)), eq(questionBankTable.teacherId, req.userId!)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao excluir questão" });
  }
});

// ─── Atividades (envio para turmas) ──────────────────────────────────────────
router.get("/teacher/activities", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  try {
    const activities = await db.select().from(activitiesTable)
      .where(eq(activitiesTable.teacherId, req.userId!))
      .orderBy(desc(activitiesTable.createdAt)).limit(50);

    // Count submissions per activity
    const activityIds = activities.map(a => a.id);
    const submissionCounts: Record<string, number> = {};
    if (activityIds.length) {
      const counts = await db.select({
        activityId: activitySubmissionsTable.activityId,
        count: sql<number>`COUNT(*)::int`,
      }).from(activitySubmissionsTable).where(inArray(activitySubmissionsTable.activityId, activityIds))
        .groupBy(activitySubmissionsTable.activityId);
      counts.forEach(c => { submissionCounts[c.activityId] = c.count; });
    }

    res.json({ activities: activities.map(a => ({ ...a, submissionCount: submissionCounts[a.id] ?? 0 })) });
  } catch {
    res.status(500).json({ error: "Erro ao buscar atividades" });
  }
});

router.post("/teacher/activities", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  const { turmaId, title, description, type, content, dueDate } = req.body;
  if (!title || !content) { res.status(400).json({ error: "Título e conteúdo são obrigatórios" }); return; }
  try {
    const [activity] = await db.insert(activitiesTable).values({
      teacherId: req.userId!, turmaId, title, description, type: type ?? "prova", content,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    }).returning();
    res.json({ ok: true, activity });
  } catch {
    res.status(500).json({ error: "Erro ao criar atividade" });
  }
});

router.get("/teacher/activities/:id/submissions", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  try {
    const [activity] = await db.select().from(activitiesTable)
      .where(and(eq(activitiesTable.id, String(req.params.id)), eq(activitiesTable.teacherId, req.userId!))).limit(1);
    if (!activity) { res.status(404).json({ error: "Atividade não encontrada" }); return; }

    const subs = await db.execute(sql`
      SELECT s.id, s.student_id, s.score, s.total, s.answers, s.submitted_at, s.time_spent_seconds,
        s.correction_status, s.ai_feedback, s.teacher_score, s.teacher_feedback, s.corrected_at,
        u.student_name, u.first_name, u.email
      FROM activity_submissions s
      LEFT JOIN users u ON u.id = s.student_id
      WHERE s.activity_id = ${String(req.params.id)}
      ORDER BY s.submitted_at DESC
    `);

    res.json({ activity, submissions: subs.rows });
  } catch {
    res.status(500).json({ error: "Erro ao buscar submissões" });
  }
});

router.patch("/teacher/activities/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { is_published, title, description, dueDate } = req.body as {
    is_published?: boolean; title?: string; description?: string; dueDate?: string;
  };
  try {
    await db.execute(sql`
      UPDATE activities
      SET is_published = COALESCE(${is_published}, is_published),
          title = COALESCE(${title ?? null}, title),
          description = COALESCE(${description ?? null}, description),
          due_date = COALESCE(${dueDate ? new Date(dueDate) : null}, due_date)
      WHERE id = ${String(req.params.id)} AND teacher_id = ${req.userId}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao atualizar atividade" });
  }
});

router.delete("/teacher/activities/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    await db.execute(sql`DELETE FROM activities WHERE id = ${String(req.params.id)} AND teacher_id = ${req.userId}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao excluir atividade" });
  }
});

router.post("/teacher/activities/:id/submissions/:subId/ai-correct", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  try {
    // Get submission + activity
    const result = await db.execute(sql`
      SELECT s.*, a.content AS activity_content, a.title AS activity_title, a.type AS activity_type
      FROM activity_submissions s
      JOIN activities a ON a.id = s.activity_id
      WHERE s.id = ${String(req.params.subId)} AND a.teacher_id = ${req.userId}
    `);
    const sub = result.rows[0] as any;
    if (!sub) { res.status(404).json({ error: "Submissão não encontrada" }); return; }

    const actContent = sub.activity_content ?? {};
    const type = sub.activity_type;
    const answers = sub.answers ?? {};

    let aiResult: any = {};

    if (type === "redacao") {
      const texto = answers.texto || answers.text || Object.values(answers)[0] || "";
      const tema = actContent.tema || sub.activity_title || "sem tema";
      aiResult = await claudeJson<any>({
        system: `Você é um corretor oficial de redação ENEM/INEP, com mais de 15 anos de experiência em correção de larga escala. Avalie com rigor técnico, justiça e empatia pedagógica.

DIRETRIZES OBRIGATÓRIAS:
- Notas por competência são DISCRETAS: 0, 40, 80, 120, 160 ou 200 (jamais valores intermediários).
- Aplique a matriz oficial INEP. Total máximo: 1000.
- Para cada competência, dê: feedback técnico (o que avaliou), pontos fortes (concretos no texto), pontos a melhorar (com exemplo).
- "feedbackAluno": tom motivador, respeitoso, sem condescender — foca no que o aluno PODE melhorar concretamente.
- "proximosPasso": 3 ações práticas e específicas (não genéricas tipo "estude mais").
- Avalie com base no que o aluno escreveu, não no que ele "deveria" ter escrito.

Retorne EXCLUSIVAMENTE JSON válido:
{"competencias":[{"numero":1,"nome":"Domínio da norma culta","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":2,"nome":"Compreensão do tema","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":3,"nome":"Organização de informações","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":4,"nome":"Mecanismos linguísticos","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":5,"nome":"Proposta de intervenção","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."}],"notaTotal":800,"comentarioGeral":"parecer geral do corretor (3-4 frases)","feedbackAluno":"Feedback motivador e respeitoso (3-4 frases)","proximosPasso":"3 ações concretas para melhorar"}`,
        user: `Tema: "${tema}"\n\nRedação:\n${texto}`,
        primary: CLAUDE_OPUS,
        fallback: CLAUDE_SONNET,
        maxTokens: 4096,
      });
      aiResult.tipo = "redacao";
      aiResult.notaSugerida = Math.round((aiResult.notaTotal / 1000) * 100);
    } else {
      // Prova/quiz — correct open answers
      const questions = actContent.questions ?? [];
      const feedbacks: any[] = [];
      let pontos = 0;
      for (const [qi, q] of questions.entries()) {
        const answer = answers[qi] ?? answers[String(qi)] ?? "";
        if (!answer) { feedbacks.push({ qi, feedback: "Sem resposta", pontos: 0 }); continue; }
        if (q.tipo === "discursiva" || !q.correct) {
          const parsed = await claudeJson<any>({
            system: `Você é professor sênior corrigindo uma questão discursiva.
DIRETRIZES:
- Pontuação 0-10, justa e proporcional ao que o aluno demonstrou.
- "feedback" técnico: o que o aluno acertou e o que faltou conceitualmente.
- "feedbackAluno": tom respeitoso, motivador, com 1 dica prática específica.
- "gabarito": resposta-modelo concisa (3-5 linhas).
Retorne JSON: {"pontos":0-10,"feedback":"...","feedbackAluno":"...","gabarito":"..."}`,
            user: `Questão: ${q.text}\nResposta do aluno: ${answer}`,
            primary: CLAUDE_SONNET,
            maxTokens: 1024,
          });
          pontos += parsed.pontos ?? 5;
          feedbacks.push({ qi, feedback: parsed.feedback, feedbackAluno: parsed.feedbackAluno, pontos: parsed.pontos ?? 5, gabarito: parsed.gabarito });
        }
      }
      aiResult = { tipo: "prova", feedbacks, pontosTotais: pontos, comentarioGeral: "Correção automática por IA." };
    }

    // Save ai_feedback to DB
    await db.execute(sql`
      UPDATE activity_submissions
      SET ai_feedback = ${JSON.stringify(aiResult)}, correction_status = 'ai_corrigido'
      WHERE id = ${String(req.params.subId)}
    `);

    res.json({ ok: true, aiResult });
  } catch (err: any) {
    console.error("ai-correct error:", err);
    res.status(500).json({ error: "Erro na correção IA" });
  }
});

router.post("/teacher/activities/:id/submissions/:subId/correct", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { teacher_score, teacher_feedback } = req.body as { teacher_score?: number; teacher_feedback?: string };
  try {
    await db.execute(sql`
      UPDATE activity_submissions
      SET teacher_score = ${teacher_score ?? null},
          teacher_feedback = ${teacher_feedback ?? null},
          correction_status = 'corrigido',
          corrected_at = NOW()
      WHERE id = ${String(req.params.subId)}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao salvar correção" });
  }
});

router.post("/teacher/question-bank/generate", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const {
    tema, materia, nivel = "Médio", quantidade = 5,
    tipo = "multipla", notebookId, texto: textoBase = "",
    saveToBank = true,
  } = req.body as {
    tema?: string; materia?: string; nivel?: string; quantidade?: number;
    tipo?: string; notebookId?: number; texto?: string; saveToBank?: boolean;
  };

  if (!tema && !textoBase) { res.status(400).json({ error: "Tema ou texto são obrigatórios" }); return; }

  try {
    const qtd = Math.min(Math.max(Number(quantidade) || 5, 1), 15);
    let ragCtx = textoBase ? `\nBase de conteúdo:\n${textoBase.slice(0, 3000)}` : "";

    if (notebookId) {
      const docs = await db.execute(sql`
        SELECT title, content_text FROM knowledge_documents
        WHERE notebook_id = ${notebookId} ORDER BY created_at DESC LIMIT 5
      `);
      (docs.rows as any[]).forEach((d: any, i: number) => {
        ragCtx += `\n\n### Fonte ${i + 1}: ${d.title}\n${(d.content_text || "").slice(0, 800)}`;
      });
    }

    const tipoMap: Record<string, string> = {
      multipla: "múltipla escolha com 4 alternativas (A-D)",
      vf: "verdadeiro ou falso",
      discursiva: "discursiva/aberta (sem alternativas, só enunciado + gabarito sugerido)",
    };

    const systemPrompt = `Você é um autor sênior de banco de questões para o ensino brasileiro (ENEM, vestibulares, BNCC), com padrão editorial premium.
Gere ${qtd} questões do tipo: ${tipoMap[tipo] || tipoMap.multipla}.
${ragCtx ? "REGRA CRÍTICA: Use EXCLUSIVAMENTE o conteúdo fornecido como base factual. Não invente fatos fora dele." : ""}

PADRÃO DE QUALIDADE OBRIGATÓRIO:
- Enunciado autocontido, tecnicamente preciso, vocabulário correto da disciplina.
- Contextualização brasileira real (situações, dados, personagens, lugares verificáveis).
- Distratores plausíveis: cada alternativa errada modela um erro comum REAL de aluno.
- Gabarito unambíguo: SÓ uma alternativa correta defensável.
- Explicação ensina o conceito (3-4 frases), não só "porque é a letra X".
- "context" carrega informação útil (texto, dado, citação) quando aplicável.
- PROIBIDO: clichês ("entre outros", "etc."), exemplos americanos, generalidades vagas.

Retorne EXCLUSIVAMENTE JSON válido — sem markdown, sem prosa antes/depois:
{
  "questions": [
    {
      "text": "enunciado completo, autocontido",
      "context": "texto de apoio (pode ser vazio se realmente desnecessário)",
      "tipo": "${tipo}",
      "alternatives": ${tipo === "discursiva" ? "[]" : tipo === "vf" ? '["Verdadeiro","Falso"]' : '["A) texto plausível","B) texto plausível","C) texto plausível","D) texto plausível"]'},
      "correct": ${tipo === "discursiva" ? "null" : "0"},
      "gabarito": "resposta esperada (para discursiva)",
      "explanation": "explicação didática (3-4 frases)",
      "dificuldade": "${nivel}",
      "source_ref": "referência à fonte (se houver)"
    }
  ]
}`;

    const parsed = await claudeJson<any>({
      system: systemPrompt,
      user: `Gere ${qtd} questões de ${materia || "conteúdo geral"} sobre "${tema || "o conteúdo fornecido"}", nível ${nivel}.${ragCtx}`,
      primary: CLAUDE_SONNET,
      maxTokens: 6144,
    });
    const questions: any[] = parsed.questions ?? [];
    const saved: any[] = [];

    if (saveToBank) {
      for (const q of questions) {
        const alts = Array.isArray(q.alternatives) && q.alternatives.length
          ? q.alternatives : (tipo === "vf" ? ["Verdadeiro","Falso"] : ["A) ","B) ","C) ","D) "]);
        const saved_q = await db.execute(sql`
          INSERT INTO question_bank (teacher_id, materia, tema, nivel, text, context, alternatives, correct, explanation, tags, origin, tipo, notebook_id)
          VALUES (${req.userId}, ${materia ?? "Geral"}, ${tema ?? "Geral"}, ${nivel}, ${q.text}, ${q.context ?? ""}, ${JSON.stringify(alts)}, ${q.correct ?? 0}, ${q.explanation ?? ""}, '[]', 'ia', ${tipo}, ${notebookId ?? null})
          RETURNING *
        `);
        saved.push(saved_q.rows[0]);
      }
    }

    res.json({ ok: true, questions: saveToBank ? saved : questions, count: questions.length });
  } catch (err: any) {
    console.error("generate-questions error:", err);
    res.status(500).json({ error: "Erro ao gerar questões" });
  }
});

router.post("/teacher/activities/from-bank", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { title, turmaId, questionIds, dueDate, tipo_prova = "prova" } = req.body as {
    title?: string; turmaId?: string; questionIds?: string[]; dueDate?: string; tipo_prova?: string;
  };
  if (!title || !questionIds?.length) { res.status(400).json({ error: "Título e questões são obrigatórios" }); return; }

  try {
    const qs = await db.execute(sql`
      SELECT * FROM question_bank WHERE id = ANY(${questionIds}::varchar[]) AND teacher_id = ${req.userId}
    `);
    const content = {
      questions: (qs.rows as any[]).map((q: any) => ({
        text: q.text, context: q.context, alternatives: q.alternatives,
        correct: q.correct, explanation: q.explanation, tipo: q.tipo,
      })),
      tipo: tipo_prova,
    };
    const [activity] = await db.insert(activitiesTable).values({
      teacherId: req.userId!, turmaId: turmaId ?? undefined,
      title, type: tipo_prova, content,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    }).returning();
    res.json({ ok: true, activity });
  } catch {
    res.status(500).json({ error: "Erro ao criar atividade do banco" });
  }
});

// ─── Correção de Redação (teacher) ────────────────────────────────────────────
router.post("/teacher/redacao-correct", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  const { tema, texto, tipo = "enem" } = req.body as { tema?: string; texto?: string; tipo?: string };
  if (!tema || !texto) { res.status(400).json({ error: "Tema e texto são obrigatórios" }); return; }
  try {
    const correction = await claudeJson<any>({
      system: `Você é um corretor oficial de redação ENEM/INEP, com mais de 15 anos de experiência em correção de larga escala. Avalie com rigor técnico, justiça e precisão de matriz oficial.

DIRETRIZES OBRIGATÓRIAS:
- Notas por competência são DISCRETAS: 0, 40, 80, 120, 160 ou 200 (jamais valores intermediários).
- Aplique a matriz oficial INEP. Total máximo: 1000.
- Para cada competência, dê: feedback técnico (o que avaliou), pontos fortes (CONCRETOS, citando trechos do texto se possível), pontos a melhorar (com exemplo prático).
- "comentarioGeral": parecer técnico do corretor (3-4 frases) — direto, sem enrolação.
- "proximosPasso": 3 ações práticas e específicas (nada genérico).
- Avalie o que o aluno escreveu, não o que ele "deveria" ter escrito.

Retorne EXCLUSIVAMENTE JSON válido — sem markdown, sem prosa antes/depois:
{
  "competencias": [
    {"numero": 1, "nome": "Domínio da norma culta", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 2, "nome": "Compreensão do tema", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 3, "nome": "Seleção e organização de informações", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 4, "nome": "Conhecimento dos mecanismos linguísticos", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 5, "nome": "Proposta de intervenção", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."}
  ],
  "notaTotal": 800,
  "comentarioGeral": "parecer geral (3-4 frases)",
  "nivelGeral": "Insuficiente / Regular / Bom / Muito Bom / Excelente",
  "proximosPasso": "3 ações prioritárias para melhorar"
}`,
      user: `Tema: "${tema}"\n\nRedação:\n${texto}`,
      primary: CLAUDE_OPUS,
      fallback: CLAUDE_SONNET,
      maxTokens: 4096,
    });
    res.json({ ok: true, correction });
  } catch {
    res.status(500).json({ error: "Erro ao corrigir redação" });
  }
});

// ─── Detalhe Individual do Aluno ──────────────────────────────────────────────
router.get("/teacher/student/:studentId/detail", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  try {
    const studentId = String(req.params.studentId);

    const [student] = await db.select({
      id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
      studentName: usersTable.studentName, email: usersTable.email, xp: usersTable.xp,
      studentGrade: usersTable.studentGrade, studentGoal: usersTable.studentGoal, createdAt: usersTable.createdAt,
    }).from(usersTable).where(eq(usersTable.id, studentId)).limit(1);

    if (!student) { res.status(404).json({ error: "Aluno não encontrado" }); return; }

    const [simulados, flashcards] = await Promise.all([
      db.select({ materia: simuladoResultsTable.materia, score: simuladoResultsTable.score, total: simuladoResultsTable.total, createdAt: simuladoResultsTable.createdAt })
        .from(simuladoResultsTable).where(eq(simuladoResultsTable.userId, studentId))
        .orderBy(desc(simuladoResultsTable.createdAt)).limit(30),
      db.select({ materia: flashcardSessionsTable.materia, known: flashcardSessionsTable.known, totalCards: flashcardSessionsTable.totalCards })
        .from(flashcardSessionsTable).where(eq(flashcardSessionsTable.userId, studentId)).limit(30),
    ]);

    const byMateria: Record<string, number[]> = {};
    for (const s of simulados) {
      const key = s.materia ?? "Geral";
      if (!byMateria[key]) byMateria[key] = [];
      byMateria[key].push(s.total > 0 ? Math.round((s.score / s.total) * 100) : 0);
    }
    const desempenhoMateria = Object.entries(byMateria).map(([materia, scores]) => ({
      materia, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    })).sort((a, b) => a.avg - b.avg);

    const avgOverall = desempenhoMateria.length ? Math.round(desempenhoMateria.reduce((s, m) => s + m.avg, 0) / desempenhoMateria.length) : 0;
    const weakSubjects = desempenhoMateria.filter(m => m.avg < 60);
    const strongSubjects = desempenhoMateria.filter(m => m.avg >= 75);

    const weeklyActivity = simulados.reduce((acc: Record<string, number>, s) => {
      const weekKey = `Sem${Math.ceil((Date.now() - new Date(s.createdAt).getTime()) / (7 * 24 * 3600 * 1000))}`;
      acc[weekKey] = (acc[weekKey] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      student: {
        name: student.studentName || `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
        email: student.email, xp: student.xp, studentGrade: student.studentGrade, studentGoal: student.studentGoal,
        joinedAt: student.createdAt,
      },
      stats: { totalSimulados: simulados.length, avgOverall, totalFlashcards: flashcards.length },
      desempenhoMateria, weakSubjects, strongSubjects, weeklyActivity,
      recentSimulados: simulados.slice(0, 5),
    });
  } catch {
    res.status(500).json({ error: "Erro ao buscar detalhe do aluno" });
  }
});

// ─── TURMA INSIGHTS — Trilha do Mestre + Diagnóstico por aluno ────────────────
// Returns rich AI-driven insights about a turma so professors can act on data.
// This closes the gap with NotebookLM-level dashboards: per-student level on
// the Trilha (Mat/PT), diagnostic completion, recent AI usage, weak topics.
router.get("/teacher/turmas/:id/insights", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  try {
    const id = String(String(req.params.id));
    const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
    if (!turma || (turma.teacherId !== req.userId! && !isAdminUser(req.userId))) {
      res.status(404).json({ error: "Turma não encontrada" }); return;
    }
    const memberships = await db.select({ studentId: turmaMembershipsTable.studentId })
      .from(turmaMembershipsTable).where(eq(turmaMembershipsTable.turmaId, id));
    const studentIds = memberships.map(m => m.studentId);
    if (!studentIds.length) {
      res.json({ students: [], summary: { totalStudents: 0, avgLevelMat: 0, avgLevelPort: 0,
        diagnosticCompleted: 0, weakTopics: [], aiAdoption: { tiagao: 0, notebook: 0, mapa: 0 } } });
      return;
    }

    // Build SQL IN list safely
    const idList = sql.join(studentIds.map(s => sql`${s}`), sql`, `);

    const [trilhaRows, diagnosticRows, tiagaoRows, notebookRows, mapaRows, studentRows, weakTopicsRows] = await Promise.all([
      db.execute(sql`SELECT user_id, subject, level, total_sessions, total_correct, total_questions, current_streak, last_session_at FROM trilha_mestre_progress WHERE user_id IN (${idList})`),
      db.execute(sql`SELECT DISTINCT user_id FROM trilha_mestre_sessions WHERE user_id IN (${idList}) AND level = 5`),
      db.execute(sql`SELECT user_id, COUNT(*)::int AS cnt FROM tiagao_conversations WHERE user_id IN (${idList}) GROUP BY user_id`),
      db.execute(sql`SELECT uploaded_by AS user_id, COUNT(*)::int AS cnt FROM knowledge_documents WHERE uploaded_by IN (${idList}) AND (is_chunk = false OR is_chunk IS NULL) GROUP BY uploaded_by`),
      db.execute(sql`SELECT user_id, COUNT(*)::int AS cnt FROM user_doc_mindmaps WHERE user_id IN (${idList}) GROUP BY user_id`),
      db.execute(sql`SELECT id, COALESCE(student_name, first_name || ' ' || last_name, email, 'Aluno') AS name, xp FROM users WHERE id IN (${idList})`),
      db.execute(sql`SELECT materia AS topic, ROUND(AVG(CASE WHEN total > 0 THEN score::numeric/total*100 ELSE 0 END),0)::int AS avg_score, COUNT(*)::int AS attempts FROM simulado_results WHERE user_id IN (${idList}) GROUP BY materia HAVING AVG(CASE WHEN total > 0 THEN score::numeric/total*100 ELSE 0 END) < 60 ORDER BY avg_score ASC LIMIT 5`),
    ]);

    // Index per student
    const trilhaMap: Record<string, any> = {};
    (trilhaRows.rows as any[]).forEach(r => {
      if (!trilhaMap[r.user_id]) trilhaMap[r.user_id] = {};
      trilhaMap[r.user_id][r.subject] = r;
    });
    const diagDone = new Set((diagnosticRows.rows as any[]).map(r => r.user_id));
    const tiagaoMap = Object.fromEntries((tiagaoRows.rows as any[]).map(r => [r.user_id, r.cnt]));
    const notebookMap = Object.fromEntries((notebookRows.rows as any[]).map(r => [r.user_id, r.cnt]));
    const mapaMap = Object.fromEntries((mapaRows.rows as any[]).map(r => [r.user_id, r.cnt]));

    const students = (studentRows.rows as any[]).map(s => {
      const t = trilhaMap[s.id] || {};
      const mat = t.matematica || t["matemática"];
      const port = t.portugues || t["português"];
      const acc = (r: any) => r && r.total_questions > 0 ? Math.round((r.total_correct / r.total_questions) * 100) : 0;
      return {
        id: s.id, name: s.name, xp: s.xp ?? 0,
        trilha: {
          mat: { level: mat?.level ?? 0, sessions: mat?.total_sessions ?? 0, accuracy: acc(mat) },
          port: { level: port?.level ?? 0, sessions: port?.total_sessions ?? 0, accuracy: acc(port) },
        },
        diagnosticCompleted: diagDone.has(s.id),
        ai: {
          tiagao: tiagaoMap[s.id] ?? 0,
          notebook: notebookMap[s.id] ?? 0,
          mapa: mapaMap[s.id] ?? 0,
        },
      };
    });

    const matLevels = students.map(s => s.trilha.mat.level).filter(l => l > 0);
    const portLevels = students.map(s => s.trilha.port.level).filter(l => l > 0);
    const summary = {
      totalStudents: students.length,
      avgLevelMat: matLevels.length ? Math.round(matLevels.reduce((a, b) => a + b, 0) / matLevels.length) : 0,
      avgLevelPort: portLevels.length ? Math.round(portLevels.reduce((a, b) => a + b, 0) / portLevels.length) : 0,
      diagnosticCompleted: students.filter(s => s.diagnosticCompleted).length,
      weakTopics: weakTopicsRows.rows,
      aiAdoption: {
        tiagao: students.filter(s => s.ai.tiagao > 0).length,
        notebook: students.filter(s => s.ai.notebook > 0).length,
        mapa: students.filter(s => s.ai.mapa > 0).length,
      },
    };

    res.json({ students: students.sort((a, b) => (b.trilha.mat.level + b.trilha.port.level) - (a.trilha.mat.level + a.trilha.port.level)), summary });
  } catch (err) {
    req.log.error({ err }, "Error fetching turma insights");
    res.status(500).json({ error: "Erro ao carregar insights da turma" });
  }
});

// ─── Cadernos por Turma ──────────────────────────────────────────────────────
router.get("/teacher/turmas/:id/notebooks", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  if (!(await assertTurmaAccess(String(req.params.id), req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notebooks (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'Meu Caderno',
        persona VARCHAR(255), goals TEXT,
        color VARCHAR(20) DEFAULT '#6366f1',
        emoji VARCHAR(10) DEFAULT '📔',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS turma_id VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private'`);

    const notebooks = await db.execute(sql`
      SELECT n.id, n.title, n.color, n.emoji, n.visibility, n.created_at,
        (SELECT COUNT(*)::int FROM knowledge_documents WHERE notebook_id = n.id) AS doc_count
      FROM notebooks n
      WHERE n.turma_id = ${String(req.params.id)}
      ORDER BY n.created_at DESC
    `);
    res.json({ notebooks: notebooks.rows });
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar cadernos" });
  }
});

router.post("/teacher/turmas/:id/notebooks", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  if (!(await assertTurmaAccess(String(req.params.id), req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  const { title, color = "#6366f1", emoji = "📚", visibility = "private" } = req.body as {
    title?: string; color?: string; emoji?: string; visibility?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Título obrigatório" }); return; }
  try {
    const result = await db.execute(sql`
      INSERT INTO notebooks (user_id, turma_id, title, color, emoji, visibility)
      VALUES (${req.userId}, ${String(req.params.id)}, ${title.trim()}, ${color}, ${emoji}, ${visibility})
      RETURNING *
    `);
    res.json({ notebook: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar caderno" });
  }
});

router.patch("/teacher/turmas/:id/notebooks/:nbId", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await assertTurmaAccess(String(req.params.id), req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  const { visibility } = req.body as { visibility?: string };
  try {
    await db.execute(sql`
      UPDATE notebooks SET visibility = ${visibility} WHERE id = ${String(req.params.nbId)} AND user_id = ${req.userId}
    `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar caderno" });
  }
});

router.delete("/teacher/turmas/:id/notebooks/:nbId", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await assertTurmaAccess(String(req.params.id), req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  try {
    await db.execute(sql`DELETE FROM notebooks WHERE id = ${String(req.params.nbId)} AND user_id = ${req.userId} AND turma_id = ${String(req.params.id)}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir caderno" });
  }
});

// ─── Lesson Plans ────────────────────────────────────────────────────────────
router.get("/teacher/lesson-plans", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    const plans = await db.execute(sql`
      SELECT lp.id, lp.title, lp.disciplina, lp.serie, lp.duracao, lp.objetivo,
        lp.turma_id, lp.notebook_id, lp.created_at,
        t.name AS turma_name
      FROM lesson_plans lp
      LEFT JOIN turmas t ON t.id = lp.turma_id
      WHERE lp.teacher_id = ${req.userId}
      ORDER BY lp.created_at DESC LIMIT 20
    `);
    res.json({ plans: plans.rows });
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar planos" });
  }
});

router.get("/teacher/lesson-plans/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = Number(String(req.params.id));
  if (!Number.isFinite(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const r = await db.execute(sql`
      SELECT id, title, disciplina, serie, duracao, objetivo, plano, created_at
      FROM lesson_plans
      WHERE id = ${id} AND teacher_id = ${req.userId}
      LIMIT 1
    `);
    const row = r.rows[0] as any;
    if (!row) { res.status(404).json({ error: "Não encontrado" }); return; }
    res.json({ plan: row });
  } catch {
    res.status(500).json({ error: "Erro ao carregar plano" });
  }
});

router.delete("/teacher/lesson-plans/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = Number(String(req.params.id));
  if (!Number.isFinite(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const r = await db.execute(sql`
      DELETE FROM lesson_plans WHERE id = ${id} AND teacher_id = ${req.userId}
    `);
    res.json({ ok: true, deleted: r.rowCount ?? 0 });
  } catch {
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

router.post("/teacher/lesson-plan", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const {
    turmaId, notebookId, disciplina, serie, duracao = "50 minutos",
    objetivo, objetivosEspecificos = "", title, save = false,
  } = req.body as {
    turmaId?: string; notebookId?: number; disciplina?: string; serie?: string;
    duracao?: string; objetivo?: string; objetivosEspecificos?: string;
    title?: string; save?: boolean;
  };

  if (!disciplina || !objetivo) {
    res.status(400).json({ error: "Disciplina e objetivo são obrigatórios" });
    return;
  }

  try {
    // RAG: search notebook if provided
    let ragContext = "";
    if (notebookId) {
      const docs = await db.execute(sql`
        SELECT title, content_text FROM knowledge_documents
        WHERE notebook_id = ${notebookId}
        ORDER BY created_at DESC LIMIT 6
      `);
      if ((docs.rows as any[]).length > 0) {
        ragContext = "\n\n## Fontes do Caderno RAG (USE como base principal):\n";
        (docs.rows as any[]).forEach((d: any, i: number) => {
          ragContext += `\n### Fonte ${i + 1}: ${d.title}\n${(d.content_text || "").slice(0, 800)}\n`;
        });
      }
    }

    const systemPrompt = `Você é um especialista em educação brasileira. Crie planos de aula profissionais, detalhados e aplicáveis.
${ragContext ? "IMPORTANTE: Use EXCLUSIVAMENTE as fontes do Caderno RAG fornecidas como base de conteúdo." : ""}
Responda SOMENTE com um JSON válido no formato especificado.`;

    const userPrompt = `Crie um plano de aula completo e profissional:
- Disciplina: ${disciplina}
- Série/Ano: ${serie || "Ensino Médio"}
- Duração: ${duracao}
- Objetivo Geral: ${objetivo}
${objetivosEspecificos ? `- Objetivos Específicos: ${objetivosEspecificos}` : ""}
${ragContext}

Retorne APENAS JSON com esta estrutura:
{
  "titulo": "string",
  "disciplina": "string",
  "serie": "string",
  "duracao": "string",
  "objetivos": ["string"],
  "conteudos": ["string"],
  "abertura": {"duracao": "string", "descricao": "string", "atividade": "string"},
  "desenvolvimento": {"duracao": "string", "descricao": "string", "atividades": ["string"]},
  "fechamento": {"duracao": "string", "descricao": "string", "avaliacao": "string"},
  "tarefa_casa": "string ou null",
  "materiais": ["string"],
  "perguntas_norteadoras": ["string"],
  "observacoes": "string",
  "recursos_digitais": ["string"]
}`;

    const plano = await claudeJson<any>({
      system: systemPrompt,
      user: userPrompt,
      primary: CLAUDE_SONNET,
      maxTokens: 4096,
    });
    const planTitle = title || plano.titulo || `Plano: ${disciplina} — ${serie || ""}`;

    // Save if requested
    let savedId: number | null = null;
    if (save) {
      const saved = await db.execute(sql`
        INSERT INTO lesson_plans (teacher_id, turma_id, notebook_id, title, disciplina, serie, duracao, objetivo, plano)
        VALUES (${req.userId}, ${turmaId ?? null}, ${notebookId ?? null}, ${planTitle}, ${disciplina}, ${serie ?? null}, ${duracao}, ${objetivo}, ${JSON.stringify(plano)})
        RETURNING id
      `);
      savedId = (saved.rows[0] as any)?.id ?? null;
    }

    res.json({ plano, title: planTitle, savedId });
  } catch (err: any) {
    console.error("lesson-plan error:", err);
    res.status(500).json({ error: "Erro ao gerar plano de aula" });
  }
});

// ─── Turma Performance (FASE 3) ──────────────────────────────────────────────
router.get("/teacher/turmas/:id/performance", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  const turmaId = String(req.params.id);
  if (!(await assertTurmaAccess(turmaId, req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  try {
    // 1. Activities for this turma (teacher-owned)
    const acts = await db.execute(sql`
      SELECT a.id, a.title, a.type, a.created_at, a.due_date,
        COUNT(s.id)::int AS submission_count,
        ROUND(AVG(CASE WHEN s.teacher_score IS NOT NULL THEN s.teacher_score
                       WHEN s.total > 0 THEN s.score::numeric / s.total * 100
                       ELSE NULL END), 1) AS avg_score,
        COUNT(CASE WHEN s.correction_status = 'corrigido' THEN 1 END)::int AS corrected_count
      FROM activities a
      LEFT JOIN activity_submissions s ON s.activity_id = a.id
      WHERE a.teacher_id = ${req.userId} AND (a.turma_id = ${turmaId} OR a.turma_id IS NULL)
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT 20
    `);

    // 2. Score distribution for most recent activity
    const recentAct = (acts.rows as any[])[0];
    let distribution: any[] = [];
    if (recentAct) {
      const dist = await db.execute(sql`
        SELECT
          CASE WHEN teacher_score IS NOT NULL THEN
            CASE WHEN teacher_score >= 90 THEN '90-100'
                 WHEN teacher_score >= 70 THEN '70-89'
                 WHEN teacher_score >= 50 THEN '50-69'
                 ELSE '0-49' END
          WHEN total > 0 THEN
            CASE WHEN score::numeric/total*100 >= 90 THEN '90-100'
                 WHEN score::numeric/total*100 >= 70 THEN '70-89'
                 WHEN score::numeric/total*100 >= 50 THEN '50-69'
                 ELSE '0-49' END
          ELSE 'N/A' END AS faixa,
          COUNT(*)::int AS count
        FROM activity_submissions
        WHERE activity_id = ${recentAct.id}
        GROUP BY 1 ORDER BY 1
      `);
      distribution = dist.rows as any[];
    }

    // 3. Per-student performance across activities
    const memberships = await db.execute(sql`
      SELECT tm.student_id, COALESCE(u.student_name, u.first_name, u.email, 'Aluno') AS name,
        COUNT(s.id)::int AS submissions,
        ROUND(AVG(CASE WHEN s.teacher_score IS NOT NULL THEN s.teacher_score
                       WHEN s.total > 0 THEN s.score::numeric/s.total*100
                       ELSE NULL END), 1) AS avg_score,
        COUNT(CASE WHEN s.activity_id IS NULL THEN 1 END)::int AS missed,
        MAX(s.submitted_at) AS last_submission
      FROM turma_memberships tm
      LEFT JOIN users u ON u.id = tm.student_id
      LEFT JOIN activity_submissions s ON s.student_id = tm.student_id
      WHERE tm.turma_id = ${turmaId}
      GROUP BY tm.student_id, u.student_name, u.first_name, u.email
    `);

    // 4. Study.IA usage for this turma's students
    const studentIds = (memberships.rows as any[]).map(m => m.student_id);
    let usageMap: Record<string, number> = {};
    if (studentIds.length > 0) {
      const idList = sql.join(studentIds.map(s => sql`${s}`), sql`, `);
      const usage = await db.execute(sql`
        SELECT user_id, COUNT(*)::int AS cnt FROM tiagao_conversations
        WHERE user_id IN (${idList}) GROUP BY user_id
      `);
      (usage.rows as any[]).forEach((r: any) => { usageMap[r.user_id] = r.cnt; });
    }

    const studentStats = (memberships.rows as any[]).map((m: any) => ({
      id: m.student_id,
      name: m.name,
      submissions: m.submissions || 0,
      avgScore: m.avg_score ? Number(m.avg_score) : null,
      platformUsage: usageMap[m.student_id] ?? 0,
      riskLevel: !m.avg_score ? "critico" : m.avg_score < 50 ? "alto" : m.avg_score < 70 ? "medio" : "ok",
    }));

    res.json({
      activities: acts.rows,
      distribution,
      studentStats,
      totalActivities: (acts.rows as any[]).length,
      avgScoreOverall: (acts.rows as any[]).filter((a: any) => a.avg_score != null).length
        ? Math.round((acts.rows as any[]).filter((a: any) => a.avg_score != null)
            .reduce((acc: number, a: any) => acc + Number(a.avg_score), 0)
          / (acts.rows as any[]).filter((a: any) => a.avg_score != null).length)
        : null,
    });
  } catch (err: any) {
    console.error("performance error:", err);
    res.status(500).json({ error: "Erro ao carregar desempenho" });
  }
});

// ─── Risk Action AI (FASE 3) ─────────────────────────────────────────────────
router.post("/teacher/turmas/:id/risk-action", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }
  if (!(await assertTurmaAccess(String(req.params.id), req.userId!))) { res.status(404).json({ error: "Turma não encontrada" }); return; }
  const { type, studentName, studentId } = req.body;
  if (!type || !studentName) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }

  try {
    // Get student stats for context
    let context = "";
    if (studentId) {
      const stats = await db.execute(sql`
        SELECT
          ROUND(AVG(CASE WHEN sr.total > 0 THEN sr.score::numeric/sr.total*100 END), 1) AS avg_score,
          COALESCE((SELECT COUNT(*) FROM tiagao_conversations tc WHERE tc.user_id = ${studentId}), 0) AS ai_usage,
          COALESCE((SELECT COUNT(*) FROM activity_submissions asub WHERE asub.student_id = ${studentId}), 0) AS submissions
        FROM simulado_results sr WHERE sr.user_id = ${studentId}
      `);
      const s = (stats.rows[0] as any) ?? {};
      context = `Dados do aluno: nota média ${s.avg_score ?? "não disponível"}%, ${s.submissions ?? 0} atividades entregues, usou a IA ${s.ai_usage ?? 0} vezes.`;
    }

    const prompts: Record<string, string> = {
      mensagem: `Você é um assistente pedagógico. Escreva uma mensagem de incentivo curta e calorosa (máx 5 frases) para o aluno ${studentName}, que está com dificuldades. ${context} A mensagem deve ser motivadora, empática, em português do Brasil. Tom: encorajador e positivo. Não mencione notas diretamente, foque no potencial.`,
      reforco: `Você é um assistente pedagógico. Proponha uma atividade de reforço personalizada para o aluno ${studentName}. ${context} Descreva: objetivo da atividade, tipo de exercício recomendado (ex: resolução de questões, resumo, mapa mental), tempo estimado, e dica de estudo. Máximo 8 frases, em português do Brasil.`,
      revisao: `Você é um assistente pedagógico. Esboce um roteiro de aula de revisão para ajudar o aluno ${studentName}. ${context} Inclua: tema central, atividades da aula (warm-up, conteúdo principal, prática), duração sugerida e estratégias para engajar um aluno com dificuldades. Máximo 10 frases, em português do Brasil.`,
    };

    const prompt = prompts[type];
    if (!prompt) { res.status(400).json({ error: "Tipo inválido" }); return; }

    const result = await claudeChat({
      system: "Você é um assistente pedagógico sênior especializado em intervenções para alunos em risco no ensino brasileiro. Tom: empático, direto, prático. Linguagem: português brasileiro, claro, sem clichês.",
      user: prompt,
      primary: CLAUDE_SONNET,
      maxTokens: 600,
    });
    res.json({ result: result || "Sem resposta." });
  } catch (err: any) {
    console.error("risk-action error:", err);
    res.status(500).json({ error: "Erro ao gerar ação de risco" });
  }
});

// ─── Report export (FASE 3) ──────────────────────────────────────────────────
router.get("/teacher/report", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  try {
    const rows = await db.execute(sql`
      SELECT
        t.name AS turma,
        COALESCE(u.student_name, u.first_name, u.email, 'Aluno') AS aluno,
        u.email,
        COALESCE(up.xp, 0) AS xp,
        ROUND(COALESCE(
          (SELECT AVG(CASE WHEN total > 0 THEN score::numeric/total*100 END)
           FROM simulado_results sr WHERE sr.user_id = u.id), 0
        ), 1) AS media_simulados,
        COALESCE((SELECT COUNT(*) FROM tiagao_conversations tc WHERE tc.user_id = u.id), 0) AS uso_tiagao,
        COALESCE((SELECT COUNT(*) FROM activity_submissions asub WHERE asub.student_id = u.id), 0) AS atividades_entregues
      FROM turma_memberships tm
      JOIN turmas t ON t.id = tm.turma_id
      JOIN users u ON u.id = tm.student_id
      LEFT JOIN user_progress up ON up.user_id = u.id
      WHERE t.teacher_id = ${req.userId}
      ORDER BY t.name, aluno
    `);

    res.json({ rows: rows.rows });
  } catch (err: any) {
    console.error("report error:", err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

export default router;
