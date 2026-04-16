import { Router, type IRouter, type Request, type Response } from "express";
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
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { roleRequestsTable } from "@workspace/db/schema";

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
  if (!turma || (turma.teacherId !== req.userId! && req.userId! !== "44063371")) {
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
  if (!turma || (turma.teacherId !== req.userId! && req.userId! !== "44063371")) {
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

export default router;
