import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import multer from "multer";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { validateFileUpload } from "../middlewares/security";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Extract text from uploaded file (PDF, DOCX, DOC, TXT) ───────────────────
async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const mime = file.mimetype;

  if (mime === "text/plain") {
    return file.buffer.toString("utf8");
  }

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (mime === "application/msword") {
    // For old .doc files, try mammoth first then fallback
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      if (result.value.length > 30) return result.value;
    } catch {
      // fall through
    }
    // Raw text fallback
    const rawText = file.buffer.toString("latin1");
    return rawText.replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ").replace(/\s{3,}/g, "\n").trim();
  }

  if (mime === "application/pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(file.buffer);
      return parsed.text;
    } catch {
      const rawText = file.buffer.toString("latin1");
      return rawText.replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ").replace(/\s{3,}/g, "\n").trim();
    }
  }

  return "";
}

// ─── Generate mind map JSON from text via AI ──────────────────────────────────
async function generateMindMapFromText(contentText: string, docTitle: string): Promise<{ subject: string; topics: Array<{ name: string; subtopics: string[] }> }> {
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
    }
  ]
}

Regras:
- subject: nome curto da matéria (ex: "Matemática", "Biologia")
- Máximo 8 tópicos principais
- Máximo 5 subtópicos por tópico
- Nomes curtos (máximo 4 palavras)
- Sem explicações, apenas o JSON`,
      },
      {
        role: "user",
        content: `Analise este documento chamado "${docTitle}" e extraia o mapa mental:\n\n${contentText.slice(0, 8000)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  let rawJson: { subject?: string; topics?: Array<{ name: string; subtopics: string[] }> } = {};
  try {
    rawJson = JSON.parse(completion.choices[0].message.content || "{}");
  } catch {
    rawJson = {};
  }

  return {
    subject: rawJson.subject || docTitle,
    topics: rawJson.topics || [],
  };
}

// Chunk size: ~4000 chars (~3 pages) for precise retrieval
const CHUNK_SIZE = 4000;
const CHUNK_OVERLAP = 400;

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return false;
  }
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1);
  if (user?.role !== "admin") {
    res.status(403).json({ erro: "Apenas administradores podem gerenciar a base de conhecimento" });
    return false;
  }
  return true;
}

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function saveDocumentWithChunks(params: {
  title: string;
  subject: string | null;
  contentText: string;
  uploadedBy: string;
  sourceFile?: string;
  fileSizeKb?: number;
  pageCount?: number;
  tags?: string[];
}): Promise<{ parentId: number; chunks: number }> {
  const { title, subject, contentText, uploadedBy, sourceFile, fileSizeKb, pageCount, tags } = params;
  const tagsArray = tags?.length ? `ARRAY[${tags.map(t => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]` : "NULL";

  // Insert parent doc with full content
  const parentResult = await db.execute(sql`
    INSERT INTO knowledge_documents (
      title, subject, content_text, uploaded_by,
      source_file, file_size_kb, page_count, tags, is_chunk, chunk_index
    )
    VALUES (
      ${title}, ${subject ?? null}, ${contentText}, ${uploadedBy},
      ${sourceFile ?? null}, ${fileSizeKb ?? null}, ${pageCount ?? null},
      ${tagsArray === "NULL" ? null : sql.raw(tagsArray)},
      false, 0
    )
    RETURNING id
  `);
  const parentId = (parentResult.rows[0] as any).id as number;

  // If content is large, also save chunks for better retrieval
  const chunks = chunkText(contentText);
  let savedChunks = 0;
  if (chunks.length > 1) {
    for (let i = 0; i < chunks.length; i++) {
      await db.execute(sql`
        INSERT INTO knowledge_documents (
          title, subject, content_text, uploaded_by,
          source_file, parent_doc_id, is_chunk, chunk_index, language
        )
        VALUES (
          ${`${title} [parte ${i + 1}/${chunks.length}]`},
          ${subject ?? null},
          ${chunks[i]},
          ${uploadedBy},
          ${sourceFile ?? null},
          ${parentId},
          true,
          ${i + 1},
          'portuguese'
        )
      `);
      savedChunks++;
    }
  }

  return { parentId, chunks: savedChunks };
}

// ─── List knowledge docs (admin) ──────────────────────────────────────────────
router.get("/knowledge", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const rows = await db.execute(sql`
      SELECT 
        id, title, subject, source_file, file_size_kb, page_count, tags,
        is_chunk, chunk_index, parent_doc_id,
        LEFT(content_text, 300) as preview,
        char_length(content_text) as content_length,
        uploaded_by, created_at
      FROM knowledge_documents
      WHERE is_chunk = false OR is_chunk IS NULL
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ docs: rows.rows });
  } catch (err) {
    req.log.error({ err }, "Error listing knowledge docs");
    res.status(500).json({ erro: "Erro ao listar documentos" });
  }
});

// ─── Stats (admin) ─────────────────────────────────────────────────────────────
router.get("/knowledge/stats", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE is_chunk = false OR is_chunk IS NULL) as total_docs,
        COUNT(*) FILTER (WHERE is_chunk = true) as total_chunks,
        COUNT(DISTINCT subject) FILTER (WHERE subject IS NOT NULL) as total_subjects,
        SUM(file_size_kb) FILTER (WHERE is_chunk = false OR is_chunk IS NULL) as total_size_kb,
        SUM(page_count) FILTER (WHERE is_chunk = false OR is_chunk IS NULL) as total_pages,
        MAX(created_at) as last_upload
      FROM knowledge_documents
    `);
    res.json(stats.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar estatísticas" });
  }
});

// ─── Upload doc (text form) ────────────────────────────────────────────────────
router.post("/knowledge/upload-text", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const { title, subject, contentText, tags } = req.body;
  if (!title || !contentText) {
    res.status(400).json({ erro: "Título e conteúdo são obrigatórios" });
    return;
  }
  try {
    const tagsArr: string[] = typeof tags === "string"
      ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : Array.isArray(tags) ? tags : [];
    const result = await saveDocumentWithChunks({
      title, subject: subject ?? null, contentText, uploadedBy: req.userId!,
      tags: tagsArr,
    });
    res.json({ ok: true, message: "Documento salvo na base de conhecimento", ...result });
  } catch (err) {
    req.log.error({ err }, "Error uploading knowledge doc");
    res.status(500).json({ erro: "Erro ao salvar documento" });
  }
});

// ─── Upload doc (PDF/TXT file) ─────────────────────────────────────────────────
router.post("/knowledge/upload-file", upload.single("file"), validateFileUpload, async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  if (!req.file) {
    res.status(400).json({ erro: "Arquivo obrigatório" });
    return;
  }
  const { title, subject, tags } = req.body;
  try {
    let contentText = "";
    let pageCount: number | undefined;

    if (req.file.mimetype === "application/pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(req.file.buffer);
      contentText = parsed.text;
      pageCount = parsed.numpages;
    } else {
      contentText = req.file.buffer.toString("utf8");
    }

    const docTitle = title || req.file.originalname.replace(/\.[^.]+$/, "");
    const fileSizeKb = Math.round(req.file.size / 1024);
    const tagsArr: string[] = typeof tags === "string"
      ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : Array.isArray(tags) ? tags : [];

    const result = await saveDocumentWithChunks({
      title: docTitle,
      subject: subject ?? null,
      contentText,
      uploadedBy: req.userId!,
      sourceFile: req.file.originalname,
      fileSizeKb,
      pageCount,
      tags: tagsArr,
    });

    res.json({
      ok: true,
      message: `Arquivo processado: ${pageCount ? pageCount + " páginas, " : ""}${result.chunks > 0 ? result.chunks + " partes indexadas" : "indexado como documento único"}`,
      ...result,
    });
  } catch (err) {
    req.log.error({ err }, "Error uploading knowledge file");
    res.status(500).json({ erro: "Erro ao processar arquivo" });
  }
});

// ─── Delete doc (and its chunks) ──────────────────────────────────────────────
router.delete("/knowledge/:id", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    // Cascade deletes chunks (via FK ON DELETE CASCADE)
    await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${id} OR parent_doc_id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar" });
  }
});

// ─── Search knowledge base (FTS + fallback ILIKE) ─────────────────────────────
router.get("/knowledge/search", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const q = String(req.query.q || "").trim();
  const subject = String(req.query.subject || "").trim();
  if (!q) { res.json({ results: [] }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT 
        id, title, subject, source_file,
        ts_headline('portuguese', content_text, plainto_tsquery('portuguese', ${q}),
          'MaxWords=60, MinWords=20, StartSel=<b>, StopSel=</b>') as excerpt,
        ts_rank(search_vector, plainto_tsquery('portuguese', ${q})) as rank
      FROM knowledge_documents
      WHERE 
        (is_chunk = false OR is_chunk IS NULL)
        AND (
          search_vector @@ plainto_tsquery('portuguese', ${q})
          OR search_vector @@ plainto_tsquery('simple', ${q})
          OR title ILIKE ${"%" + q + "%"}
        )
        ${subject ? sql`AND subject ILIKE ${"%" + subject + "%"}` : sql``}
      ORDER BY rank DESC, created_at DESC
      LIMIT 8
    `);

    // If FTS returns nothing, fallback to chunk search for better coverage
    let results = rows.rows as any[];
    if (results.length === 0) {
      const fallback = await db.execute(sql`
        SELECT id, title, subject, source_file, parent_doc_id,
          LEFT(content_text, 500) as excerpt
        FROM knowledge_documents
        WHERE content_text ILIKE ${"%" + q + "%"}
          OR title ILIKE ${"%" + q + "%"}
        ORDER BY created_at DESC
        LIMIT 8
      `);
      results = fallback.rows as any[];
    }

    res.json({ results });
  } catch (err) {
    req.log.error({ err }, "Knowledge search error");
    res.status(500).json({ erro: "Erro na busca" });
  }
});

// ─── Internal search helper (used by chat/professor routes) ───────────────────
export async function searchKnowledge(query: string, subject?: string, limit = 4): Promise<string> {
  if (!query.trim()) return "";
  try {
    const rows = await db.execute(sql`
      SELECT title, subject, 
        LEFT(content_text, 1500) as content
      FROM knowledge_documents
      WHERE 
        search_vector @@ plainto_tsquery('portuguese', ${query})
        OR search_vector @@ plainto_tsquery('simple', ${query})
        OR content_text ILIKE ${"%" + query.slice(0, 100) + "%"}
        ${subject ? sql`OR subject ILIKE ${"%" + subject + "%"}` : sql``}
      ORDER BY 
        ts_rank(search_vector, plainto_tsquery('portuguese', ${query})) DESC,
        created_at DESC
      LIMIT ${limit}
    `);

    if (!rows.rows.length) return "";
    const docs = rows.rows as Array<{ title: string; subject: string; content: string }>;
    return docs.map(d =>
      `[Base de Conhecimento — ${d.subject ? d.subject + ": " : ""}${d.title}]\n${d.content}`
    ).join("\n\n---\n\n");
  } catch {
    return "";
  }
}

// ─── Generate mind map from document (student) ────────────────────────────────
router.post("/mapa-mental/from-doc", upload.single("file"), validateFileUpload, async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { title } = req.body;

  try {
    const docTitle = title || (req.file?.originalname.replace(/\.[^.]+$/, "") ?? "Documento");
    let contentText = "";

    if (req.file) {
      contentText = await extractTextFromFile(req.file);
    } else if (req.body.contentText) {
      contentText = req.body.contentText;
    } else {
      res.status(400).json({ erro: "Arquivo ou texto obrigatório" });
      return;
    }

    if (!contentText || contentText.trim().length < 30) {
      res.status(422).json({ erro: "O documento não tem conteúdo de texto suficiente. Tente um PDF com texto selecionável (não escaneado)." });
      return;
    }

    const { subject, topics } = await generateMindMapFromText(contentText, docTitle);
    const mindMapJson = { subject, topics, docTitle, source: "document" };

    await db.execute(sql`
      INSERT INTO user_doc_mindmaps (user_id, doc_title, mind_map_json)
      VALUES (${req.userId}, ${docTitle}, ${JSON.stringify(mindMapJson)}::jsonb)
    `);

    res.json({ ok: true, mindMap: mindMapJson });
  } catch (err) {
    req.log.error({ err }, "Error generating mind map from doc");
    res.status(500).json({ erro: "Erro ao gerar mapa mental. Tente novamente." });
  }
});

// ─── Professor: Generate mind map from their document ─────────────────────────
router.post("/mapa-mental/professor/from-doc", upload.single("file"), validateFileUpload, async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { title, subject } = req.body;

  try {
    const docTitle = title || (req.file?.originalname.replace(/\.[^.]+$/, "") ?? "Material");
    let contentText = "";

    if (req.file) {
      contentText = await extractTextFromFile(req.file);
    } else if (req.body.contentText) {
      contentText = req.body.contentText;
    } else {
      res.status(400).json({ erro: "Arquivo ou texto obrigatório" });
      return;
    }

    if (!contentText || contentText.trim().length < 30) {
      res.status(422).json({ erro: "O documento não tem conteúdo de texto suficiente. Tente um PDF com texto selecionável (não escaneado)." });
      return;
    }

    const { subject: aiSubject, topics } = await generateMindMapFromText(contentText, docTitle);
    const finalSubject = subject?.trim() || aiSubject;
    const mindMapJson = { subject: finalSubject, topics, docTitle, source: "professor" };

    await db.execute(sql`
      INSERT INTO professor_mindmaps (professor_id, doc_title, subject, mind_map_json)
      VALUES (${req.userId}, ${docTitle}, ${finalSubject}, ${JSON.stringify(mindMapJson)}::jsonb)
    `);

    res.json({ ok: true, mindMap: mindMapJson });
  } catch (err) {
    req.log.error({ err }, "Error generating professor mind map from doc");
    res.status(500).json({ erro: "Erro ao gerar mapa mental. Tente novamente." });
  }
});

// ─── Professor: List their mind maps ──────────────────────────────────────────
router.get("/mapa-mental/professor/my-maps", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT id, doc_title, subject, mind_map_json, created_at
      FROM professor_mindmaps
      WHERE professor_id = ${req.userId}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json({ maps: rows.rows });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar mapas do professor" });
  }
});

// ─── Professor: Delete a mind map ─────────────────────────────────────────────
router.delete("/mapa-mental/professor/my-maps/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    await db.execute(sql`DELETE FROM professor_mindmaps WHERE id = ${id} AND professor_id = ${req.userId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar mapa" });
  }
});

// ─── Subject mind maps: generate from teacher_content per subject ──────────────
router.get("/mapa-mental/materias", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT subject, title, content_text
      FROM teacher_content
      WHERE subject IS NOT NULL AND subject != ''
      ORDER BY subject, created_at DESC
    `);

    // Group by subject
    const grouped: Record<string, { title: string; topics: string[] }[]> = {};
    for (const row of rows.rows as any[]) {
      const s = row.subject as string;
      if (!grouped[s]) grouped[s] = [];
      // Extract first 3 lines as topic hints
      const preview = (row.content_text as string).split("\n").filter((l: string) => l.trim().length > 0).slice(0, 3).map((l: string) => l.trim().slice(0, 60));
      grouped[s].push({ title: row.title, topics: preview });
    }

    // Build subject mind map list
    const subjectMaps = Object.entries(grouped).map(([subject, docs]) => ({
      subject,
      topics: docs.map(d => ({
        name: d.title.slice(0, 50),
        subtopics: d.topics,
      })),
    }));

    res.json({ subjects: subjectMaps });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar mapas de matérias" });
  }
});

// ─── Get user document mind maps ──────────────────────────────────────────────
router.get("/mapa-mental/my-docs", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
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
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
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
