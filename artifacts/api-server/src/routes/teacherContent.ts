import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { isAdminUser } from "../lib/adminCheck";

const router: IRouter = Router();

async function isAdmin(req: Request): Promise<boolean> {
  if (!req.userId) return false;
  if (isAdminUser(req.userId)) return true;
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  return user?.role === "admin";
}

// GET /api/teacher-content — list all teacher content (any logged-in user)
router.get("/teacher-content", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  try {
    const result = await db.execute(sql`
      SELECT id, title, subject, grade_level, file_name, file_type, tags, uploaded_by, created_at,
             LEFT(content_text, 200) as content_preview
      FROM teacher_content
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json({ content: result.rows });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar conteúdo" });
  }
});

// POST /api/teacher-content — add new content (admin only)
router.post("/teacher-content", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  if (!(await isAdmin(req))) {
    res.status(403).json({ erro: "Acesso restrito" });
    return;
  }

  const { title, subject, gradeLevel, contentText, fileName, fileType, tags } = req.body as {
    title?: string;
    subject?: string;
    gradeLevel?: string;
    contentText?: string;
    fileName?: string;
    fileType?: string;
    tags?: string;
  };

  if (!title || !contentText) {
    res.status(400).json({ erro: "Título e conteúdo são obrigatórios" });
    return;
  }

  if (title.length > 300) {
    res.status(400).json({ erro: "Título muito longo (máx. 300 caracteres)" });
    return;
  }

  try {
    const result = await db.execute(sql`
      INSERT INTO teacher_content (title, subject, grade_level, content_text, file_name, file_type, tags, uploaded_by)
      VALUES (${title.trim()}, ${subject?.trim() || null}, ${gradeLevel?.trim() || null}, ${contentText}, ${fileName?.trim() || null}, ${fileType?.trim() || null}, ${tags?.trim() || null}, ${req.userId})
      RETURNING id
    `);
    res.json({ ok: true, id: (result.rows[0] as any).id });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao salvar conteúdo" });
  }
});

// DELETE /api/teacher-content/:id — delete content (admin only)
router.delete("/teacher-content/:id", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  if (!(await isAdmin(req))) {
    res.status(403).json({ erro: "Acesso restrito" });
    return;
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ erro: "ID inválido" });
    return;
  }
  try {
    await db.execute(sql`DELETE FROM teacher_content WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar" });
  }
});

export default router;
