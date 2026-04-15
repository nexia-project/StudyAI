import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  turmasTable,
  turmaMembershipsTable,
  instituicoesTable,
  institutionUsersTable,
  simuladoResultsTable,
  flashcardSessionsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

async function isInstitutionAdmin(userId: string): Promise<boolean> {
  const user = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return ["institution_admin", "admin"].includes(user[0]?.role ?? "");
}

// ─── Create institution ───────────────────────────────────────────────────────
router.post("/institution", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (req.userId! !== "44063371") { res.status(403).json({ error: "Apenas super-admin pode criar instituições" }); return; }

  const { name, city, state, cnpj, adminUserId, primaryColor } = req.body as any;
  if (!name?.trim()) { res.status(400).json({ error: "Nome é obrigatório" }); return; }

  const [inst] = await db.insert(instituicoesTable).values({
    name: name.trim(), city: city?.trim() || null, state: state?.trim() || null,
    cnpj: cnpj?.trim() || null, adminUserId: adminUserId || null,
    primaryColor: primaryColor || "#6366f1",
  }).returning();

  // Set role for admin user
  if (adminUserId) {
    await db.update(usersTable).set({ role: "institution_admin" }).where(eq(usersTable.id, adminUserId));
    await db.insert(institutionUsersTable).values({ institutionId: inst.id, userId: adminUserId, role: "admin" });
  }

  res.json({ institution: inst });
});

// ─── Get all institutions (admin only) ───────────────────────────────────────
router.get("/institution", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (req.userId! !== "44063371") { res.status(403).json({ error: "Acesso negado" }); return; }

  const institutions = await db.select().from(instituicoesTable).orderBy(desc(instituicoesTable.createdAt));
  res.json({ institutions });
});

// ─── Get my institution ───────────────────────────────────────────────────────
router.get("/institution/me", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }

  const instUser = await db.select({ institutionId: institutionUsersTable.institutionId, role: institutionUsersTable.role })
    .from(institutionUsersTable).where(eq(institutionUsersTable.userId, req.userId!)).limit(1);

  if (!instUser.length) { res.json({ institution: null }); return; }

  const [inst] = await db.select().from(instituicoesTable).where(eq(instituicoesTable.id, instUser[0].institutionId)).limit(1);
  res.json({ institution: inst, role: instUser[0].role });
});

// ─── Get institution detail ───────────────────────────────────────────────────
router.get("/institution/:id", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }

  const { id } = req.params;
  const [inst] = await db.select().from(instituicoesTable).where(eq(instituicoesTable.id, id)).limit(1);
  if (!inst) { res.status(404).json({ error: "Instituição não encontrada" }); return; }

  // Check access
  const isAdmin = req.userId! === "44063371";
  if (!isAdmin) {
    const member = await db.select().from(institutionUsersTable)
      .where(and(eq(institutionUsersTable.institutionId, id), eq(institutionUsersTable.userId, req.userId!))).limit(1);
    if (!member.length) { res.status(403).json({ error: "Acesso negado" }); return; }
  }

  // Get all turmas for this institution
  const turmas = await db.select().from(turmasTable).where(eq(turmasTable.institutionId, id));
  const turmaIds = turmas.map(t => t.id);

  // Get teachers
  const teachers = await db.select({
    id: institutionUsersTable.userId, role: institutionUsersTable.role,
    firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email,
  }).from(institutionUsersTable)
    .leftJoin(usersTable, eq(institutionUsersTable.userId, usersTable.id))
    .where(and(eq(institutionUsersTable.institutionId, id), eq(institutionUsersTable.role, "teacher")));

  // Student count
  let studentCount = 0;
  if (turmaIds.length) {
    const sc = await db.select({ count: sql<number>`count(distinct ${turmaMembershipsTable.studentId})::int` })
      .from(turmaMembershipsTable).where(inArray(turmaMembershipsTable.turmaId, turmaIds));
    studentCount = sc[0]?.count ?? 0;
  }

  // Avg XP across all students
  let avgXp = 0;
  if (turmaIds.length) {
    const memberships = await db.select({ studentId: turmaMembershipsTable.studentId })
      .from(turmaMembershipsTable).where(inArray(turmaMembershipsTable.turmaId, turmaIds));
    const studentIds = [...new Set(memberships.map(m => m.studentId))];
    if (studentIds.length) {
      const xpData = await db.select({ avg: sql<number>`avg(${usersTable.xp})` })
        .from(usersTable).where(inArray(usersTable.id, studentIds));
      avgXp = Math.round(xpData[0]?.avg ?? 0);
    }
  }

  res.json({
    institution: inst,
    turmas: turmas.map(t => ({ ...t, teacherCount: 1 })),
    teachers,
    stats: { turmaCount: turmas.length, studentCount, avgXp, teacherCount: teachers.length },
  });
});

// ─── Add teacher to institution ───────────────────────────────────────────────
router.post("/institution/:id/teachers", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { teacherEmail } = req.body as { teacherEmail?: string };
  if (!teacherEmail) { res.status(400).json({ error: "Email do professor é obrigatório" }); return; }

  const [teacher] = await db.select().from(usersTable).where(eq(usersTable.email, teacherEmail.toLowerCase().trim())).limit(1);
  if (!teacher) { res.status(404).json({ error: "Usuário não encontrado com esse email" }); return; }

  // Set teacher role
  await db.update(usersTable).set({ role: "teacher" }).where(eq(usersTable.id, teacher.id));

  // Associate with institution
  const existing = await db.select().from(institutionUsersTable)
    .where(and(eq(institutionUsersTable.institutionId, req.params.id), eq(institutionUsersTable.userId, teacher.id))).limit(1);
  if (!existing.length) {
    await db.insert(institutionUsersTable).values({ institutionId: req.params.id, userId: teacher.id, role: "teacher" });
  }

  res.json({ success: true });
});

// ─── Institution reports ──────────────────────────────────────────────────────
router.get("/institution/:id/report", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const turmas = await db.select().from(turmasTable).where(eq(turmasTable.institutionId, req.params.id));
  const turmaIds = turmas.map(t => t.id);
  if (!turmaIds.length) { res.json({ report: { turmas: [], generatedAt: new Date() } }); return; }

  const memberships = await db.select()
    .from(turmaMembershipsTable).where(inArray(turmaMembershipsTable.turmaId, turmaIds));
  const studentIds = [...new Set(memberships.map(m => m.studentId))];

  const students = studentIds.length
    ? await db.select({ id: usersTable.id, xp: usersTable.xp, studentName: usersTable.studentName, studentGrade: usersTable.studentGrade })
        .from(usersTable).where(inArray(usersTable.id, studentIds))
    : [];

  const simStats = studentIds.length
    ? await db.select({ count: sql<number>`count(*)::int`, avg: sql<number>`avg(${simuladoResultsTable.score}::float / nullif(${simuladoResultsTable.total},0)*100)` })
        .from(simuladoResultsTable).where(inArray(simuladoResultsTable.userId, studentIds))
    : [{ count: 0, avg: 0 }];

  const xps = students.map(s => s.xp ?? 0);
  const avgXp = xps.length ? Math.round(xps.reduce((a, b) => a + b, 0) / xps.length) : 0;

  res.json({
    report: {
      institution: req.params.id,
      generatedAt: new Date(),
      totalTurmas: turmas.length,
      totalStudents: studentIds.length,
      avgXp,
      simCompleted: simStats[0]?.count ?? 0,
      avgSimAccuracy: Math.round(simStats[0]?.avg ?? 0),
      turmaBreakdown: turmas.map(t => ({
        id: t.id, name: t.name, serie: t.serie, subject: t.subject,
        studentCount: memberships.filter(m => m.turmaId === t.id).length,
      })),
    },
  });
});

export default router;
