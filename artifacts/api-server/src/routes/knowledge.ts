import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!!!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return false;
  }
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (user?.role !== "admin") {
    res.status(403).json({ erro: "Apenas administradores podem gerenciar a base de conhecimento" });
    return false;
  }
  return true;
}

// ─── List knowledge docs ───────────────────────────────────────────────────────
router.get("/knowledge", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const rows = await db.execute(sql`
      SELECT id, title, subject, LEFT(content_text, 300) as preview, uploaded_by, created_at
      FROM knowledge_documents
      ORDER BY created_at DESC
    `);
    res.json({ docs: rows.rows });
  } catch (err) {
    req.log.error({ err }, "Error listing knowledge docs");
    res.status(500).json({ erro: "Erro ao listar documentos" });
  }
});

// ─── Upload doc (text form) ────────────────────────────────────────────────────
router.post("/knowledge/upload-text", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const { title, subject, contentText } = req.body;
  if (!title || !contentText) {
    res.status(400).json({ erro: "Título e conteúdo são obrigatórios" });
    return;
  }
  try {
    await db.execute(sql`
      INSERT INTO knowledge_documents (title, subject, content_text, uploaded_by)
      VALUES (${title}, ${subject ?? null}, ${contentText}, ${req.userId})
    `);
    res.json({ ok: true, message: "Documento adicionado à base de conhecimento" });
  } catch (err) {
    req.log.error({ err }, "Error uploading knowledge doc");
    res.status(500).json({ erro: "Erro ao salvar documento" });
  }
});

// ─── Upload doc (PDF/TXT file) ─────────────────────────────────────────────────
router.post("/knowledge/upload-file", upload.single("file"), async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const { title, subject } = req.body;
  if (!req.file) {
    res.status(400).json({ erro: "Arquivo obrigatório" });
    return;
  }
  try {
    let contentText = "";
    if (req.file.mimetype === "application/pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(req.file.buffer);
      contentText = parsed.text;
    } else {
      contentText = req.file.buffer.toString("utf8");
    }
    const docTitle = title || req.file.originalname.replace(/\.[^.]+$/, "");
    await db.execute(sql`
      INSERT INTO knowledge_documents (title, subject, content_text, uploaded_by)
      VALUES (${docTitle}, ${subject ?? null}, ${contentText.slice(0, 100000)}, ${req.userId})
    `);
    res.json({ ok: true, message: "Arquivo processado e adicionado à base de conhecimento" });
  } catch (err) {
    req.log.error({ err }, "Error uploading knowledge file");
    res.status(500).json({ erro: "Erro ao processar arquivo" });
  }
});

// ─── Delete doc ────────────────────────────────────────────────────────────────
router.delete("/knowledge/:id", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar" });
  }
});

// ─── Search knowledge base (internal + external) ───────────────────────────────
router.get("/knowledge/search", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const q = String(req.query.q || "").trim();
  if (!q) { res.json({ results: [] }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT id, title, subject, LEFT(content_text, 500) as excerpt
      FROM knowledge_documents
      WHERE content_text ILIKE ${"%" + q + "%"} OR title ILIKE ${"%" + q + "%"}
      LIMIT 5
    `);
    res.json({ results: rows.rows });
  } catch (err) {
    res.status(500).json({ erro: "Erro na busca" });
  }
});

// ─── Generate mind map from document (for any user) ───────────────────────────
router.post("/mapa-mental/from-doc", upload.single("file"), async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { title } = req.body;

  try {
    let contentText = "";
    if (req.file) {
      if (req.file.mimetype === "application/pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const parsed = await pdfParse(req.file.buffer);
        contentText = parsed.text;
      } else {
        contentText = req.file.buffer.toString("utf8");
      }
    } else if (req.body.contentText) {
      contentText = req.body.contentText;
    } else {
      res.status(400).json({ erro: "Arquivo ou texto obrigatório" });
      return;
    }

    const docTitle = title || (req.file?.originalname.replace(/\.[^.]+$/, "") ?? "Documento");

    // Use GPT-4o to extract mind map structure from document
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em organização de conhecimento. Analise o documento fornecido e extraia sua estrutura de conhecimento em formato de mapa mental.

Retorne SOMENTE um JSON válido com esta estrutura exata:
{
  "subject": "Nome da Matéria Principal",
  "topics": [
    {
      "name": "Tópico 1",
      "subtopics": ["Subtópico 1.1", "Subtópico 1.2"]
    },
    {
      "name": "Tópico 2",
      "subtopics": ["Subtópico 2.1"]
    }
  ]
}

Regras:
- subject: nome curto da matéria (ex: "Matemática", "Biologia")
- Máximo 8 tópicos principais
- Máximo 5 subtópicos por tópico
- Nomes curtos (máximo 4 palavras)
- Sem explicações, apenas o JSON`
        },
        {
          role: "user",
          content: `Analise este documento e extraia o mapa mental:\n\n${contentText.slice(0, 8000)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const rawJson = JSON.parse(completion.choices[0].message.content || "{}");
    const subject: string = rawJson.subject || docTitle;
    const topics: Array<{ name: string; subtopics: string[] }> = rawJson.topics || [];

    // Save to user_doc_mindmaps
    const mindMapJson = { subject, topics, docTitle, source: "document" };
    await db.execute(sql`
      INSERT INTO user_doc_mindmaps (user_id, doc_title, mind_map_json)
      VALUES (${req.userId}, ${docTitle}, ${JSON.stringify(mindMapJson)}::jsonb)
    `);

    res.json({ ok: true, mindMap: mindMapJson });
  } catch (err) {
    req.log.error({ err }, "Error generating mind map from doc");
    res.status(500).json({ erro: "Erro ao gerar mapa mental" });
  }
});

// ─── Get user document mind maps ──────────────────────────────────────────────
router.get("/mapa-mental/my-docs", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT id, doc_title, mind_map_json, created_at
      FROM user_doc_mindmaps
      WHERE user_id = ${req.userId}
      ORDER BY created_at DESC
      LIMIT 20
    `);
    res.json({ maps: rows.rows });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar mapas" });
  }
});

// ─── Delete user doc mind map ─────────────────────────────────────────────────
router.delete("/mapa-mental/my-docs/:id", async (req: Request, res: Response) => {
  if (!!!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    await db.execute(sql`DELETE FROM user_doc_mindmaps WHERE id = ${id} AND user_id = ${req.userId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar mapa" });
  }
});

export default router;
