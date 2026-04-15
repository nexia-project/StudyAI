import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/profile — returns the authenticated user's student profile
router.get("/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }

  try {
    const [user] = await db
      .select({
        studentName: usersTable.studentName,
        studentGrade: usersTable.studentGrade,
        studentGoal: usersTable.studentGoal,
        studentConcursoAlvo: usersTable.studentConcursoAlvo,
        studentPhone: usersTable.studentPhone,
        studentSchoolType: usersTable.studentSchoolType,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.id))
      .limit(1);

    res.json({
      studentName: user?.studentName ?? null,
      studentGrade: user?.studentGrade ?? null,
      studentGoal: user?.studentGoal ?? null,
      studentConcursoAlvo: user?.studentConcursoAlvo ?? null,
      studentPhone: user?.studentPhone ?? null,
      studentSchoolType: user?.studentSchoolType ?? null,
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      email: user?.email ?? null,
      profileImageUrl: user?.profileImageUrl ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching profile");
    res.status(500).json({ erro: "Erro ao buscar perfil" });
  }
});

// POST /api/profile — saves the authenticated user's student profile
router.post("/profile", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }

  const { studentName, studentGrade, studentGoal, studentConcursoAlvo, studentPhone, studentSchoolType } = req.body as {
    studentName?: string;
    studentGrade?: string;
    studentGoal?: string;
    studentConcursoAlvo?: string;
    studentPhone?: string;
    studentSchoolType?: string;
  };

  try {
    await db
      .update(usersTable)
      .set({
        ...(studentName !== undefined && { studentName: studentName.trim() || null }),
        ...(studentGrade !== undefined && { studentGrade }),
        ...(studentGoal !== undefined && { studentGoal }),
        ...(studentConcursoAlvo !== undefined && { studentConcursoAlvo: studentConcursoAlvo.trim() || null }),
        ...(studentPhone !== undefined && { studentPhone: studentPhone.trim() || null }),
        ...(studentSchoolType !== undefined && { studentSchoolType: studentSchoolType || null }),
      })
      .where(eq(usersTable.id, req.user.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error saving profile");
    res.status(500).json({ erro: "Erro ao salvar perfil" });
  }
});

export default router;
