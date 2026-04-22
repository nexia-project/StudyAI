import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  usersTable, turmasTable, turmaMembershipsTable, turmaTarefasTable,
  simuladoResultsTable, flashcardSessionsTable, userActivityTable,
  questionBankTable, activitiesTable, activitySubmissionsTable, redacoesTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray, gte } from "drizzle-orm";
import { roleRequestsTable } from "@workspace/db/schema";
import { isAdminUser } from "../lib/adminCheck";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const { id } = req.params;
  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
  if (!turma || (turma.teacherId !== req.userId! && !isAdminUser(req.userId))) {
    res.status(404).json({ error: "Turma não encontrada" }); return;
  }

  res.json({ turma });
});

// ─── Update turma ─────────────────────────────────────────────────────────────
router.put("/teacher/turmas/:id", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { id } = req.params;
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
  const { id } = req.params;
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

  const { id } = req.params;
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
  const { id, studentId } = req.params;
  const [turma] = await db.select().from(turmasTable).where(eq(turmasTable.id, id)).limit(1);
  if (!turma || turma.teacherId !== req.userId!) { res.status(404).json({ error: "Turma não encontrada" }); return; }

  await db.delete(turmaMembershipsTable).where(
    and(eq(turmaMembershipsTable.turmaId, id), eq(turmaMembershipsTable.studentId, studentId))
  );
  res.json({ success: true });
});

// ─── Turma tasks CRUD ─────────────────────────────────────────────────────────
router.get("/teacher/turmas/:id/tasks", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const tasks = await db.select().from(turmaTarefasTable)
    .where(eq(turmaTarefasTable.turmaId, req.params.id))
    .orderBy(desc(turmaTarefasTable.createdAt));
  res.json({ tasks });
});

router.post("/teacher/turmas/:id/tasks", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { type, title, description, materia, dueDate } = req.body as any;
  if (!type || !title) { res.status(400).json({ error: "type e title são obrigatórios" }); return; }

  const [task] = await db.insert(turmaTarefasTable).values({
    turmaId: req.params.id,
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
  await db.delete(turmaTarefasTable).where(
    and(eq(turmaTarefasTable.id, req.params.taskId), eq(turmaTarefasTable.turmaId, req.params.id))
  );
  res.json({ success: true });
});

// ─── Turma dashboard aggregate ────────────────────────────────────────────────
router.get("/teacher/turmas/:id/dashboard", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isTeacherOrAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { id } = req.params;
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
  const { id } = req.params;

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
      systemContent = `Você é um criador de experiências educativas gamificadas para o ensino brasileiro.
Crie uma PROVA MODO MUNDO — uma jornada narrativa onde cada questão é um desafio dentro de uma missão.
${weaknessCtx}
Retorne SOMENTE JSON válido:
{
  "title": "título criativo da jornada",
  "story": {
    "cenario": "descrição do mundo/universo da missão (2-3 frases vívidas)",
    "missao": "a missão que o jogador precisa cumprir",
    "personagem": "nome e descrição curta do personagem guia",
    "objetivo": "o objetivo final da jornada",
    "emoji": "emoji temático"
  },
  "questions": [
    {
      "number": 1,
      "desafio": "como este desafio se conecta à história (1 frase narrativa)",
      "text": "enunciado da questão em si",
      "context": "situação-problema ou texto de apoio (pode ser vazio)",
      "alternatives": ["A) texto", "B) texto", "C) texto", "D) texto"],
      "correct": 0,
      "explanation": "explicação da resposta correta",
      "imageDescription": "ilustração ideal para este desafio"
    }
  ],
  "totalQuestions": ${qtd}
}`;
      userContent = `Crie uma jornada narrativa com ${qtd} desafios de ${materia} sobre "${tema}", nível ${nivel || "médio"}. Contexto: ${estilo}. A história deve ser envolvente e cada desafio matematicamente/cientificamente correto.`;
    } else {
      systemContent = `Você é um professor especialista em criar provas no estilo ${estilo} para o ensino brasileiro.
Crie questões de múltipla escolha envolventes, com contexto real e situações do cotidiano brasileiro.
${weaknessCtx}
Retorne SOMENTE JSON válido:
{
  "title": "Prova de ${materia} — ${tema}",
  "questions": [
    {
      "number": 1,
      "text": "enunciado completo",
      "context": "texto de apoio ou situação-problema (pode ser vazio)",
      "alternatives": ["A) texto", "B) texto", "C) texto", "D) texto"],
      "correct": 0,
      "explanation": "explicação detalhada da resposta correta",
      "imageDescription": "ilustração ideal (tipo: gráfico de funções, mapa do Brasil, diagrama de célula, etc)"
    }
  ],
  "totalQuestions": ${qtd}
}`;
      userContent = `Crie ${qtd} questões de ${materia} sobre "${tema}", nível ${nivel || "médio"}, estilo ${estilo}. As questões devem ser contextualizadas com situações reais do Brasil.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.75,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: systemContent }, { role: "user", content: userContent }],
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
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
    const inputCtx = conteudo.trim() ? `\nCONTEÚDO DE REFERÊNCIA FORNECIDO PELO USUÁRIO:\n${conteudo.slice(0, 3000)}` : "";
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é um especialista em educação brasileira que cria materiais pedagógicos completos.
Para o tópico solicitado, gere um pacote completo de aprendizagem.${inputCtx}

Retorne SOMENTE JSON válido com EXATAMENTE esta estrutura:
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
    {"n": 5, "tipo": "destaque", "titulo": "Saiba mais", "texto": "insight importante ou curiosidade", "emoji": "🔥"},
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
}`,
        },
        { role: "user", content: `Crie um pacote completo sobre "${topico}" para ${nivel} — tipo: ${tipo}.` },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    res.json({ ok: true, content: parsed });
  } catch (err) {
    req.log.error({ err }, "Error creating content");
    res.status(500).json({ error: "Erro ao criar conteúdo" });
  }
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é uma enciclopédia educacional brasileira especializada em ENEM, vestibulares e concursos.${kbContext}

Para o tema pesquisado, crie um pacote completo de aprendizagem.
Retorne SOMENTE JSON válido com esta estrutura:
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
}`,
        },
        { role: "user", content: `Pesquisa: "${query}"` },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: `Você é o Assistente do Professor, um copiloto de IA especializado no ensino brasileiro (ENEM, vestibular, ensino médio).
Você ajuda professores a:
- Criar aulas, resumos, exercícios e provas
- Gerar explicações claras para qualquer tema
- Adaptar conteúdo para diferentes níveis
- Analisar desempenho de turmas
- Criar planos de aula semanais e mensais
- Sugerir estratégias pedagógicas
Seja objetivo, prático e use linguagem direta. Quando gerar listas ou exercícios, use formato Markdown.`,
        },
        ...history.slice(-10).map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content ?? "";
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
      .where(and(eq(questionBankTable.id, req.params.id), eq(questionBankTable.teacherId, req.userId!)));
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
      .where(and(eq(activitiesTable.id, req.params.id), eq(activitiesTable.teacherId, req.userId!))).limit(1);
    if (!activity) { res.status(404).json({ error: "Atividade não encontrada" }); return; }

    const subs = await db.execute(sql`
      SELECT s.id, s.student_id, s.score, s.total, s.answers, s.submitted_at, s.time_spent_seconds,
        s.correction_status, s.ai_feedback, s.teacher_score, s.teacher_feedback, s.corrected_at,
        u.student_name, u.first_name, u.email
      FROM activity_submissions s
      LEFT JOIN users u ON u.id = s.student_id
      WHERE s.activity_id = ${req.params.id}
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
      WHERE id = ${req.params.id} AND teacher_id = ${req.userId}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro ao atualizar atividade" });
  }
});

router.delete("/teacher/activities/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    await db.execute(sql`DELETE FROM activities WHERE id = ${req.params.id} AND teacher_id = ${req.userId}`);
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
      WHERE s.id = ${req.params.subId} AND a.teacher_id = ${req.userId}
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
      const corrRes = await openai.chat.completions.create({
        model: "gpt-4o-mini", temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `Você é um corretor de redação ENEM experiente. Corrija a redação e retorne JSON com:
{"competencias":[{"numero":1,"nome":"Domínio da norma culta","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":2,"nome":"Compreensão do tema","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":3,"nome":"Organização de informações","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":4,"nome":"Mecanismos linguísticos","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."},{"numero":5,"nome":"Proposta de intervenção","nota":160,"feedback":"...","pontosFortes":"...","pontosMelhorar":"..."}],"notaTotal":800,"comentarioGeral":"...","feedbackAluno":"Feedback motivador e respeitoso para o aluno (3-4 frases)","proximosPasso":"3 ações concretas para melhorar"}
Notas por competência: 0,40,80,120,160,200. Total max:1000.` },
          { role: "user", content: `Tema: "${tema}"\n\nRedação:\n${texto}` },
        ],
      });
      aiResult = JSON.parse(corrRes.choices[0].message.content ?? "{}");
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
          const fb = await openai.chat.completions.create({
            model: "gpt-4o-mini", temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `Você é professor corrigindo questão discursiva. Retorne JSON: {"pontos":0-10,"feedback":"...","feedbackAluno":"...","gabarito":"..."}` },
              { role: "user", content: `Questão: ${q.text}\nResposta do aluno: ${answer}` },
            ],
          });
          const parsed = JSON.parse(fb.choices[0].message.content ?? "{}");
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
      WHERE id = ${req.params.subId}
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
      WHERE id = ${req.params.subId}
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

    const systemPrompt = `Você é professor especialista criando questões para o ensino brasileiro. Gere ${qtd} questões do tipo: ${tipoMap[tipo] || tipoMap.multipla}.
${ragCtx ? "Use EXCLUSIVAMENTE o conteúdo fornecido como base." : ""}
Retorne APENAS JSON:
{
  "questions": [
    {
      "text": "enunciado completo",
      "context": "texto de apoio ou situação-problema (pode ser vazio)",
      "tipo": "${tipo}",
      "alternatives": ${tipo === "discursiva" ? "[]" : tipo === "vf" ? '["Verdadeiro","Falso"]' : '["A) texto","B) texto","C) texto","D) texto"]'},
      "correct": ${tipo === "discursiva" ? "null" : "0"},
      "gabarito": "resposta esperada (para discursiva)",
      "explanation": "explicação da resposta",
      "dificuldade": "${nivel}",
      "source_ref": "referência à fonte (se houver)"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Gere ${qtd} questões de ${materia || "conteúdo geral"} sobre "${tema || "o conteúdo fornecido"}", nível ${nivel}.${ragCtx}` },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{
        role: "system",
        content: `Você é um corretor experiente de redações do ENEM. Corrija com rigor e precisão, como um corretor oficial.
Retorne JSON:
{
  "competencias": [
    {"numero": 1, "nome": "Domínio da norma culta", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 2, "nome": "Compreensão do tema", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 3, "nome": "Seleção e organização de informações", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 4, "nome": "Conhecimento dos mecanismos linguísticos", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."},
    {"numero": 5, "nome": "Proposta de intervenção", "nota": 160, "feedback": "...", "pontosFortes": "...", "pontosMelhorar": "..."}
  ],
  "notaTotal": 800,
  "comentarioGeral": "parecer geral do corretor (3-4 frases)",
  "nivelGeral": "Bom / Muito Bom / Excelente / Regular",
  "proximosPasso": "3 ações prioritárias para melhorar"
}
Notas por competência: 0, 40, 80, 120, 160, 200. Total máximo: 1000.`,
      }, { role: "user", content: `Tema: "${tema}"\n\nRedação:\n${texto}` }],
    });

    const correction = JSON.parse(completion.choices[0].message.content ?? "{}");
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
    const { studentId } = req.params;

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
    const { id } = req.params;
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
      WHERE n.turma_id = ${req.params.id}
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
  const { title, color = "#6366f1", emoji = "📚", visibility = "private" } = req.body as {
    title?: string; color?: string; emoji?: string; visibility?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Título obrigatório" }); return; }
  try {
    const result = await db.execute(sql`
      INSERT INTO notebooks (user_id, turma_id, title, color, emoji, visibility)
      VALUES (${req.userId}, ${req.params.id}, ${title.trim()}, ${color}, ${emoji}, ${visibility})
      RETURNING *
    `);
    res.json({ notebook: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar caderno" });
  }
});

router.patch("/teacher/turmas/:id/notebooks/:nbId", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const { visibility } = req.body as { visibility?: string };
  try {
    await db.execute(sql`
      UPDATE notebooks SET visibility = ${visibility} WHERE id = ${req.params.nbId} AND user_id = ${req.userId}
    `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar caderno" });
  }
});

router.delete("/teacher/turmas/:id/notebooks/:nbId", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    await db.execute(sql`DELETE FROM notebooks WHERE id = ${req.params.nbId} AND user_id = ${req.userId} AND turma_id = ${req.params.id}`);
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const plano = JSON.parse(raw);
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
  const { id: turmaId } = req.params;

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.75,
    });

    res.json({ result: completion.choices[0]?.message?.content ?? "Sem resposta." });
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
