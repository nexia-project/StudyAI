import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  turmasTable,
  turmaMembershipsTable,
  instituicoesTable,
  institutionUsersTable,
  institutionInvitesTable,
  simuladoResultsTable,
  flashcardSessionsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray, lt } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const SUPER_ADMIN = "44063371";

function isSuperAdmin(userId: string) { return userId === SUPER_ADMIN; }

async function getInstitutionRole(userId: string, institutionId: string) {
  const rows = await db.select().from(institutionUsersTable)
    .where(and(eq(institutionUsersTable.userId, userId), eq(institutionUsersTable.institutionId, institutionId)))
    .limit(1);
  return rows[0] ?? null;
}

async function isInstitutionAdmin(userId: string, institutionId?: string): Promise<boolean> {
  if (isSuperAdmin(userId)) return true;
  const user = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (["admin"].includes(user[0]?.role ?? "")) return true;
  if (institutionId) {
    const member = await getInstitutionRole(userId, institutionId);
    return !!member && ["admin", "owner"].includes(member.role);
  }
  return ["institution_admin"].includes(user[0]?.role ?? "");
}

// ─── Create institution ───────────────────────────────────────────────────────
router.post("/institution", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!isSuperAdmin(req.userId!)) { res.status(403).json({ error: "Apenas super-admin pode criar instituições" }); return; }

  const { name, city, state, cnpj, adminUserId, primaryColor, planType, maxUsers, maxTeachers } = req.body as any;
  if (!name?.trim()) { res.status(400).json({ error: "Nome é obrigatório" }); return; }

  const [inst] = await db.insert(instituicoesTable).values({
    name: name.trim(), city: city?.trim() || null, state: state?.trim() || null,
    cnpj: cnpj?.trim() || null, adminUserId: adminUserId || null,
    primaryColor: primaryColor || "#6366f1",
    planType: planType || "trial",
    maxUsers: maxUsers || 100,
    maxTeachers: maxTeachers || 10,
  }).returning();

  if (adminUserId) {
    await db.update(usersTable).set({ role: "institution_admin" }).where(eq(usersTable.id, adminUserId));
    await db.insert(institutionUsersTable).values({
      institutionId: inst.id, userId: adminUserId, role: "admin", isApproved: true,
    });
  }

  res.json({ institution: inst });
});

// ─── Get all institutions (super-admin) ──────────────────────────────────────
router.get("/institution", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!isSuperAdmin(req.userId!)) { res.status(403).json({ error: "Acesso negado" }); return; }
  const institutions = await db.select().from(instituicoesTable).orderBy(desc(instituicoesTable.createdAt));
  res.json({ institutions });
});

// ─── Get my institution membership ───────────────────────────────────────────
router.get("/institution/me", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }

  const rows = await db.select({
    institutionId: institutionUsersTable.institutionId,
    role: institutionUsersTable.role,
    isApproved: institutionUsersTable.isApproved,
  }).from(institutionUsersTable).where(eq(institutionUsersTable.userId, req.userId!)).limit(1);

  if (!rows.length) { res.json({ institution: null }); return; }

  const [inst] = await db.select().from(instituicoesTable).where(eq(instituicoesTable.id, rows[0].institutionId)).limit(1);
  res.json({ institution: inst, role: rows[0].role, isApproved: rows[0].isApproved });
});

// ─── Accept invite by token ───────────────────────────────────────────────────
router.post("/institution/accept-invite", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }

  const { token } = req.body as { token?: string };
  if (!token) { res.status(400).json({ error: "Token obrigatório" }); return; }

  const [invite] = await db.select().from(institutionInvitesTable)
    .where(eq(institutionInvitesTable.token, token)).limit(1);

  if (!invite) { res.status(404).json({ error: "Convite não encontrado" }); return; }
  if (invite.usedAt) { res.status(400).json({ error: "Convite já utilizado" }); return; }
  if (new Date(invite.expiresAt) < new Date()) { res.status(400).json({ error: "Convite expirado" }); return; }

  // Get user email to validate
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (user?.email?.toLowerCase() !== invite.email.toLowerCase()) {
    res.status(403).json({ error: "Este convite foi enviado para outro email" }); return;
  }

  // Check if already a member
  const existing = await db.select().from(institutionUsersTable)
    .where(and(eq(institutionUsersTable.institutionId, invite.institutionId), eq(institutionUsersTable.userId, req.userId!))).limit(1);

  if (!existing.length) {
    await db.insert(institutionUsersTable).values({
      institutionId: invite.institutionId, userId: req.userId!, role: invite.role,
      isApproved: true, invitedBy: invite.invitedBy ?? null, inviteEmail: invite.email,
    });
  } else {
    await db.update(institutionUsersTable).set({ isApproved: true })
      .where(and(eq(institutionUsersTable.institutionId, invite.institutionId), eq(institutionUsersTable.userId, req.userId!)));
  }

  // Mark invite as used
  await db.update(institutionInvitesTable).set({ usedAt: new Date() }).where(eq(institutionInvitesTable.token, token));

  // Set teacher role
  if (["teacher", "admin"].includes(invite.role)) {
    await db.update(usersTable).set({ role: invite.role === "admin" ? "institution_admin" : "teacher" }).where(eq(usersTable.id, req.userId!));
  }

  const [inst] = await db.select().from(instituicoesTable).where(eq(instituicoesTable.id, invite.institutionId)).limit(1);
  res.json({ success: true, institution: inst, role: invite.role });
});

// ─── Get institution detail ───────────────────────────────────────────────────
router.get("/institution/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }

  const { id } = req.params;
  const [inst] = await db.select().from(instituicoesTable).where(eq(instituicoesTable.id, id)).limit(1);
  if (!inst) { res.status(404).json({ error: "Instituição não encontrada" }); return; }

  const isAdmin = isSuperAdmin(req.userId!);
  if (!isAdmin) {
    const member = await getInstitutionRole(req.userId!, id);
    if (!member) { res.status(403).json({ error: "Acesso negado" }); return; }
    if (!member.isApproved) { res.status(403).json({ error: "aguardando_aprovacao" }); return; }
  }

  const turmas = await db.select().from(turmasTable).where(eq(turmasTable.institutionId, id));
  const turmaIds = turmas.map(t => t.id);

  const members = await db.select({
    id: institutionUsersTable.id,
    userId: institutionUsersTable.userId,
    role: institutionUsersTable.role,
    isApproved: institutionUsersTable.isApproved,
    inviteEmail: institutionUsersTable.inviteEmail,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    email: usersTable.email,
  }).from(institutionUsersTable)
    .leftJoin(usersTable, eq(institutionUsersTable.userId, usersTable.id))
    .where(eq(institutionUsersTable.institutionId, id));

  const teachers = members.filter(m => ["teacher", "admin", "owner"].includes(m.role));

  let studentCount = 0;
  if (turmaIds.length) {
    const sc = await db.select({ count: sql<number>`count(distinct ${turmaMembershipsTable.studentId})::int` })
      .from(turmaMembershipsTable).where(inArray(turmaMembershipsTable.turmaId, turmaIds));
    studentCount = sc[0]?.count ?? 0;
  }

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

  // Pending members
  const pendingInvites = await db.select().from(institutionInvitesTable)
    .where(and(eq(institutionInvitesTable.institutionId, id), sql`used_at IS NULL`, sql`expires_at > now()`));

  res.json({
    institution: inst,
    turmas: turmas.map(t => ({ ...t, teacherCount: 1 })),
    teachers,
    members,
    pendingInvites,
    stats: { turmaCount: turmas.length, studentCount, avgXp, teacherCount: teachers.length, memberCount: members.length },
  });
});

// ─── Update institution branding ──────────────────────────────────────────────
router.patch("/institution/:id/branding", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!, req.params.id))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { logoUrl, primaryColor, name, city, state, cnpj } = req.body as any;
  const updates: Record<string, any> = {};
  if (logoUrl !== undefined) updates.logoUrl = logoUrl;
  if (primaryColor !== undefined) updates.primaryColor = primaryColor;
  if (name !== undefined) updates.name = name;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;
  if (cnpj !== undefined) updates.cnpj = cnpj;

  const [updated] = await db.update(instituicoesTable).set(updates)
    .where(eq(instituicoesTable.id, req.params.id)).returning();
  res.json({ institution: updated });
});

// ─── Update contract/plan ─────────────────────────────────────────────────────
router.patch("/institution/:id/contract", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!isSuperAdmin(req.userId!)) { res.status(403).json({ error: "Apenas super-admin pode alterar contratos" }); return; }

  const { planType, contractStart, contractEnd, maxUsers, maxTeachers } = req.body as any;
  const updates: Record<string, any> = {};
  if (planType) updates.planType = planType;
  if (contractStart) updates.contractStart = new Date(contractStart);
  if (contractEnd) updates.contractEnd = new Date(contractEnd);
  if (maxUsers) updates.maxUsers = maxUsers;
  if (maxTeachers) updates.maxTeachers = maxTeachers;

  const [updated] = await db.update(instituicoesTable).set(updates)
    .where(eq(instituicoesTable.id, req.params.id)).returning();
  res.json({ institution: updated });
});

// ─── Invite member by email ───────────────────────────────────────────────────
router.post("/institution/:id/invite", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!, req.params.id))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { email, role } = req.body as { email?: string; role?: string };
  if (!email?.trim()) { res.status(400).json({ error: "Email é obrigatório" }); return; }
  const validRoles = ["teacher", "admin"];
  const memberRole = validRoles.includes(role ?? "") ? role! : "teacher";

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invite] = await db.insert(institutionInvitesTable).values({
    institutionId: req.params.id,
    email: email.trim().toLowerCase(),
    role: memberRole,
    token,
    invitedBy: req.userId!,
    expiresAt,
  }).returning();

  // If user already exists, add them directly as pending (not approved yet unless admin)
  const [existingUser] = await db.select().from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);

  if (existingUser) {
    const existing = await db.select().from(institutionUsersTable)
      .where(and(eq(institutionUsersTable.institutionId, req.params.id), eq(institutionUsersTable.userId, existingUser.id))).limit(1);
    if (!existing.length) {
      await db.insert(institutionUsersTable).values({
        institutionId: req.params.id,
        userId: existingUser.id,
        role: memberRole,
        isApproved: false,
        invitedBy: req.userId!,
        inviteEmail: email.trim().toLowerCase(),
      });
    }
  }

  const [inst] = await db.select({ name: instituicoesTable.name }).from(instituicoesTable)
    .where(eq(instituicoesTable.id, req.params.id)).limit(1);

  res.json({
    success: true,
    inviteLink: `${req.headers.origin || "https://study.ia.br"}/instituicao/convite/${token}`,
    inviteToken: token,
    institutionName: inst?.name,
  });
});

// ─── Approve / revoke member ──────────────────────────────────────────────────
router.patch("/institution/:id/members/:memberId/approve", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!, req.params.id))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { approved } = req.body as { approved: boolean };
  await db.update(institutionUsersTable)
    .set({ isApproved: approved })
    .where(and(eq(institutionUsersTable.id, req.params.memberId), eq(institutionUsersTable.institutionId, req.params.id)));

  res.json({ success: true });
});

// ─── Remove member ────────────────────────────────────────────────────────────
router.delete("/institution/:id/members/:memberId", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!, req.params.id))) { res.status(403).json({ error: "Acesso negado" }); return; }

  await db.delete(institutionUsersTable)
    .where(and(eq(institutionUsersTable.id, req.params.memberId), eq(institutionUsersTable.institutionId, req.params.id)));

  res.json({ success: true });
});

// ─── Add teacher by email (direct add, backwards compat) ─────────────────────
router.post("/institution/:id/teachers", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!, req.params.id))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const { teacherEmail } = req.body as { teacherEmail?: string };
  if (!teacherEmail) { res.status(400).json({ error: "Email do professor é obrigatório" }); return; }

  const [teacher] = await db.select().from(usersTable).where(eq(usersTable.email, teacherEmail.toLowerCase().trim())).limit(1);
  if (!teacher) { res.status(404).json({ error: "Usuário não encontrado com esse email" }); return; }

  await db.update(usersTable).set({ role: "teacher" }).where(eq(usersTable.id, teacher.id));

  const existing = await db.select().from(institutionUsersTable)
    .where(and(eq(institutionUsersTable.institutionId, req.params.id), eq(institutionUsersTable.userId, teacher.id))).limit(1);
  if (!existing.length) {
    await db.insert(institutionUsersTable).values({
      institutionId: req.params.id, userId: teacher.id, role: "teacher", isApproved: true,
    });
  } else {
    await db.update(institutionUsersTable).set({ isApproved: true })
      .where(and(eq(institutionUsersTable.institutionId, req.params.id), eq(institutionUsersTable.userId, teacher.id)));
  }

  res.json({ success: true });
});

// ─── Institution detailed report ──────────────────────────────────────────────
router.get("/institution/:id/report", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  if (!(await isInstitutionAdmin(req.userId!, req.params.id))) { res.status(403).json({ error: "Acesso negado" }); return; }

  const turmas = await db.select().from(turmasTable).where(eq(turmasTable.institutionId, req.params.id));
  const turmaIds = turmas.map(t => t.id);
  if (!turmaIds.length) { res.json({ report: { turmas: [], generatedAt: new Date() } }); return; }

  const memberships = await db.select().from(turmaMembershipsTable).where(inArray(turmaMembershipsTable.turmaId, turmaIds));
  const studentIds = [...new Set(memberships.map(m => m.studentId))];

  const students = studentIds.length
    ? await db.select({ id: usersTable.id, xp: usersTable.xp, studentName: usersTable.studentName, escola: usersTable.escola })
        .from(usersTable).where(inArray(usersTable.id, studentIds))
    : [];

  const simStats = studentIds.length
    ? await db.select({ count: sql<number>`count(*)::int`, avg: sql<number>`avg(${simuladoResultsTable.score}::float / nullif(${simuladoResultsTable.total},0)*100)` })
        .from(simuladoResultsTable).where(inArray(simuladoResultsTable.userId, studentIds))
    : [{ count: 0, avg: 0 }];

  const flashStats = studentIds.length
    ? await db.select({ count: sql<number>`count(*)::int` })
        .from(flashcardSessionsTable).where(inArray(flashcardSessionsTable.userId, studentIds))
    : [{ count: 0 }];

  const xps = students.map(s => s.xp ?? 0);
  const avgXp = xps.length ? Math.round(xps.reduce((a, b) => a + b, 0) / xps.length) : 0;

  // Per-turma breakdown
  const turmaBreakdown = turmas.map(t => {
    const turmaStudents = memberships.filter(m => m.turmaId === t.id).map(m => m.studentId);
    const turmaStudentData = students.filter(s => turmaStudents.includes(s.id));
    const turmaXps = turmaStudentData.map(s => s.xp ?? 0);
    return {
      id: t.id, name: t.name, serie: t.serie, subject: t.subject,
      studentCount: turmaStudents.length,
      avgXp: turmaXps.length ? Math.round(turmaXps.reduce((a, b) => a + b, 0) / turmaXps.length) : 0,
    };
  });

  res.json({
    report: {
      institution: req.params.id,
      generatedAt: new Date(),
      totalTurmas: turmas.length,
      totalStudents: studentIds.length,
      avgXp,
      simCompleted: simStats[0]?.count ?? 0,
      avgSimAccuracy: Math.round(simStats[0]?.avg ?? 0),
      flashcardsCompleted: flashStats[0]?.count ?? 0,
      turmaBreakdown,
    },
  });
});

export default router;
