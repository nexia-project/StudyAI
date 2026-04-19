import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import {
  usersTable,
  turmasTable,
  turmaMembershipsTable,
  turmaTarefasTable,
  simuladoResultsTable,
  flashcardSessionsTable,
  userActivityTable,
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

export default router;
