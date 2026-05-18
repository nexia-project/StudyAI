import { Router, type IRouter, type Request, type Response } from "express";
import { createRequire } from "module";
import { openai, OR } from "../lib/aiClient";
import multer from "multer";
import AdmZip from "adm-zip";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { validateFileUpload } from "../middlewares/security";
import { enrichTopicFromWikipedia } from "./wikipedia";
import { normalizeMindMap } from "../lib/notebook-fallbacks";

// createRequire allows safe CJS import from ESM — avoids pdf-parse@1.1.1 module-level ENOENT bug
const _require = createRequire(import.meta.url);

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Extract text from uploaded file (PDF, DOCX, DOC, TXT) ───────────────────
async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const mime = file.mimetype;

  if (mime === "text/plain") {
    return sanitizeText(file.buffer.toString("utf8"));
  }

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return sanitizeText(result.value);
  }

  if (mime === "application/msword") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      if (result.value.length > 30) return sanitizeText(result.value);
    } catch {
      // fall through
    }
    const rawText = file.buffer.toString("latin1");
    return sanitizeText(rawText.replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ").replace(/\s{3,}/g, "\n").trim());
  }

  if (mime === "application/pdf") {
    try {
      // Use createRequire (safe) instead of dynamic import (triggers ENOENT bug)
      const pdfParser = _require("pdf-parse/lib/pdf-parse");
      const parsed = await pdfParser(file.buffer);
      const extracted = sanitizeText(parsed.text);
      if (extracted.trim().length > 20) return extracted;
      // Fallback for scanned PDFs: use Latin-1 raw text extraction
      const rawText = file.buffer.toString("latin1");
      return sanitizeText(rawText.replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ").replace(/\s{3,}/g, "\n").trim());
    } catch {
      const rawText = file.buffer.toString("latin1");
      return sanitizeText(rawText.replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ").replace(/\s{3,}/g, "\n").trim());
    }
  }

  if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    try {
      const zip = new AdmZip(file.buffer);
      const entries = zip.getEntries();
      const textParts: string[] = [];
      for (const entry of entries) {
        // Slide XMLs live at ppt/slides/slide*.xml
        if (entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)) {
          const xmlContent = entry.getData().toString("utf8");
          // Extract text from <a:t> tags (DrawingML text runs)
          const matches = xmlContent.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g);
          for (const m of matches) {
            const t = m[1].trim();
            if (t) textParts.push(t);
          }
        }
      }
      return sanitizeText(textParts.join(" "));
    } catch {
      return "";
    }
  }

  return "";
}

// ─── Generate mind map JSON from text via AI ──────────────────────────────────
async function generateMindMapFromText(contentText: string, docTitle: string): Promise<any> {
  try {
    const completion = await openai.chat.completions.create({
      model: OR.fast,
      temperature: 0.35,
      max_tokens: 6000,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em síntese visual, mapas mentais e aprendizagem ativa. Gere um mapa mental denso o suficiente para estudo real, inspirado em boas práticas de Miro, XMind, Whimsical, MindMeister e notas source-grounded tipo NotebookLM.

Retorne SOMENTE JSON válido neste formato:
{
  "subject": "Tema central (max 5 palavras)",
  "icone": "emoji do tema",
  "categories": [
    {
      "name": "Ramo principal (max 4 palavras)",
      "icone": "emoji",
      "cor": "#7c3aed",
      "topics": [
        {
          "name": "Subtema (max 5 palavras)",
          "subtopics": [
            {
              "name": "Conceito específico",
              "detail": "1-2 frases: definição, exemplo, fórmula, data ou como cai.",
              "evidencia": "trecho curto literal/parafraseado do documento",
              "pagina": "p. X ou trecho Y se souber"
            }
          ]
        }
      ]
    }
  ],
  "conexoesCruzadas": [
    { "de": "Ramo A", "para": "Ramo B", "relacao": "relação curta" }
  ],
  "conceitosChave": ["termo: definição curta"],
  "sourceSnippets": [{ "ref": "Trecho 1", "text": "evidência curta da fonte" }]
}

REGRAS OBRIGATÓRIAS:
- 5 a 8 ramos principais, agrupados por função pedagógica: fundamentos, processos, exemplos, aplicações, fórmulas/datas/termos, erros comuns e revisão.
- 2 a 5 tópicos por ramo e 2 a 5 subtópicos por tópico.
- Inclua exemplos, definições, fórmulas, datas, nomes próprios e termos que realmente aparecem na fonte.
- Inclua 3 a 5 conexões cruzadas e 6 a 8 conceitos-chave.
- Não devolva mapa genérico, lista rasa ou menos de 20 subtópicos.
- Idioma: português brasileiro. Saída: apenas JSON.`,
        },
        {
          role: "user",
          content: `Documento: "${docTitle}"\n\n${contentText.slice(0, 50_000)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content || "{}";
    let rawJson: any = {};
    try {
      rawJson = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      rawJson = {};
    }
    return normalizeMindMap(rawJson, docTitle, contentText);
  } catch (err: any) {
    console.warn("[mapa-mental] provider unavailable, using deterministic fallback:", err?.message);
    return {
      ...normalizeMindMap({}, docTitle, contentText),
      providerWarning: "A IA principal não respondeu; geramos um mapa estruturado localmente a partir do texto extraído.",
    };
  }
}

// Chunk size: ~4000 chars (~3 pages) for precise retrieval
const CHUNK_SIZE = 4000;
const CHUNK_OVERLAP = 400;

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return false;
  }
  // Check by id OR clerk_id to handle Clerk ID vs internal ID mismatch
  const result = await db.execute(sql`
    SELECT role FROM users WHERE id = ${req.userId} OR clerk_id = ${req.userId} LIMIT 1
  `);
  const row = (result.rows as any[])[0];
  if (row?.role !== "admin") {
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

/** Remove characters PostgreSQL cannot store in TEXT columns.
 *  - Null bytes (\u0000) cause "invalid byte sequence" errors
 *  - Other C0 control chars except \t \n \r are stripped
 *  - Excess whitespace is collapsed */
function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")              // null bytes — PostgreSQL rejects these
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")  // other control chars except \t\n\r
    .replace(/[ \t]+/g, " ")             // collapse horizontal whitespace
    .replace(/\n{4,}/g, "\n\n\n")        // collapse excessive blank lines
    .trim();
}

/** Parse PDF buffer safely — avoids pdf-parse@1.1.1 module-level ENOENT bug.
 *  Uses createRequire to load the internal CJS parser directly, skipping the
 *  wrapper index.js that reads a test file at module load time. */
async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  try {
    // _require('pdf-parse/lib/pdf-parse') loads the actual parser function
    // without triggering the module-level readFileSync('./test/data/05-versions-space.pdf')
    const pdfParser = _require("pdf-parse/lib/pdf-parse");
    return await pdfParser(buffer);
  } catch (err: any) {
    console.warn("[knowledge] parsePdfBuffer error:", err?.message);
    throw err;
  }
}

// ─── Upload doc (PDF/TXT/DOCX file) ───────────────────────────────────────────
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
    let warning: string | undefined;
    const mime = req.file.mimetype;

    // Use shared extractor (handles PDF, DOCX, DOC, TXT, PPTX)
    contentText = await extractTextFromFile(req.file);

    // For PDF, also try to get page count
    if (mime === "application/pdf") {
      try {
        const pdfParser = _require("pdf-parse/lib/pdf-parse");
        const parsed = await pdfParser(req.file.buffer);
        pageCount = parsed.numpages || undefined;
      } catch { /* ignore */ }
    }

    const docTitle = title || req.file.originalname.replace(/\.[^.]+$/, "");

    // If text is still too short, save the document with minimal metadata
    // (admin knows what they're doing — don't reject, just warn)
    if (!contentText || contentText.trim().length < 20) {
      contentText = `[Documento: ${docTitle}]\n\nArquivo: ${req.file.originalname}\nTamanho: ${Math.round(req.file.size / 1024)} KB\n\nNota: O texto não pôde ser extraído automaticamente. Este pode ser um PDF escaneado, apresentação com apenas imagens, ou arquivo protegido.`;
      warning = "Não foi possível extrair texto selecionável do arquivo. O documento foi salvo com metadados. PDFs escaneados ou com apenas imagens não são pesquisáveis pela IA.";
    }

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

    const charCount = contentText.trim().length;
    const wordCount = contentText.trim().split(/\s+/).length;
    const preview = contentText.trim().slice(0, 300).replace(/\s+/g, " ");

    res.json({
      ok: true,
      message: warning
        ? `⚠️ Salvo com aviso: ${docTitle}. ${warning}`
        : `✅ Processado: ${pageCount ? pageCount + " páginas · " : ""}${wordCount.toLocaleString("pt-BR")} palavras · ${result.chunks > 0 ? result.chunks + " partes indexadas" : "indexado"}`,
      warning,
      ...result,
      charCount,
      wordCount,
      preview,
      pageCount: pageCount ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error uploading knowledge file");
    res.status(500).json({ erro: "Erro ao processar arquivo" });
  }
});

// ─── Delete doc (and its chunks) ──────────────────────────────────────────────
router.delete("/knowledge/:id", async (req: Request, res: Response) => {
  if (!await requireAdmin(req, res)) return;
  const id = parseInt(String(req.params.id));
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

    const localDocs = rows.rows as Array<{ title: string; subject: string; content: string }>;
    const localContent = localDocs.map(d =>
      `[Base de Conhecimento — ${d.subject ? d.subject + ": " : ""}${d.title}]\n${d.content}`
    ).join("\n\n---\n\n");

    // If local knowledge is insufficient (< 300 chars), enrich with Wikipedia PT
    if (localContent.length < 300 && query.trim().length >= 3) {
      try {
        const wikiContent = await enrichTopicFromWikipedia(query, subject);
        if (wikiContent) {
          return localContent
            ? `${localContent}\n\n---\n\n${wikiContent}`
            : wikiContent;
        }
      } catch {
        // Wikipedia fallback failed silently — return what we have
      }
    }

    return localContent;
  } catch {
    return "";
  }
}

// ─── Search with Wikipedia always enriching ────────────────────────────────────
export async function searchKnowledgeRich(query: string, subject?: string): Promise<string> {
  const [local, wiki] = await Promise.allSettled([
    searchKnowledge(query, subject, 3),
    enrichTopicFromWikipedia(query, subject),
  ]);
  const parts: string[] = [];
  if (local.status === "fulfilled" && local.value) parts.push(local.value);
  if (wiki.status === "fulfilled" && wiki.value) parts.push(wiki.value);
  return parts.join("\n\n---\n\n");
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

    const mindMapJson = {
      ...(await generateMindMapFromText(contentText, docTitle)),
      docTitle,
      source: "document",
    };

    const inserted = await db.execute(sql`
      INSERT INTO user_doc_mindmaps (user_id, doc_title, mind_map_json)
      VALUES (${req.userId}, ${docTitle}, ${JSON.stringify(mindMapJson)}::jsonb)
      RETURNING id
    `);

    res.json({ ok: true, id: (inserted.rows[0] as any)?.id, mindMap: mindMapJson });
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

    const generatedMap = await generateMindMapFromText(contentText, docTitle);
    const finalSubject = subject?.trim() || generatedMap.subject || docTitle;
    const mindMapJson = { ...generatedMap, subject: finalSubject, docTitle, source: "professor" };

    const inserted = await db.execute(sql`
      INSERT INTO professor_mindmaps (professor_id, doc_title, subject, mind_map_json)
      VALUES (${req.userId}, ${docTitle}, ${finalSubject}, ${JSON.stringify(mindMapJson)}::jsonb)
      RETURNING id
    `);

    res.json({ ok: true, id: (inserted.rows[0] as any)?.id, mindMap: mindMapJson });
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
  const id = parseInt(String(req.params.id));
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
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    await db.execute(sql`DELETE FROM user_doc_mindmaps WHERE id = ${id} AND user_id = ${req.userId}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao deletar mapa" });
  }
});

// ─── User: Upload file (any authenticated user) ───────────────────────────────
router.post("/knowledge/user-upload", upload.single("file"), validateFileUpload, async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  if (!req.file) { res.status(400).json({ erro: "Arquivo obrigatório" }); return; }
  const { title, subject, tags } = req.body;
  try {
    const contentText = await extractTextFromFile(req.file);
    if (!contentText || contentText.trim().length < 10) {
      res.status(422).json({ erro: "Não foi possível extrair texto do arquivo. Use um PDF com texto selecionável (não escaneado)." });
      return;
    }
    let pageCount: number | undefined;
    if (req.file.mimetype === "application/pdf") {
      try { const p = _require("pdf-parse/lib/pdf-parse"); pageCount = (await p(req.file.buffer)).numpages; } catch { /* ignore */ }
    }
    const docTitle = title || req.file.originalname.replace(/\.[^.]+$/, "");
    const fileSizeKb = Math.round(req.file.size / 1024);
    const tagsArr: string[] = typeof tags === "string" ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    const result = await saveDocumentWithChunks({
      title: docTitle, subject: subject ?? null, contentText,
      uploadedBy: req.userId, sourceFile: req.file.originalname, fileSizeKb, pageCount, tags: tagsArr,
    });
    res.json({ ok: true, message: "Documento salvo com sucesso!", ...result });
  } catch (err) {
    req.log.error({ err }, "Error uploading user knowledge doc");
    res.status(500).json({ erro: "Erro ao processar arquivo" });
  }
});

// ─── User: Upload URL ─────────────────────────────────────────────────────────
router.post("/knowledge/user-upload-url", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { url, title, subject, tags } = req.body;
  if (!url) { res.status(400).json({ erro: "URL obrigatória" }); return; }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 StudyAI/1.0" }, signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) { res.status(422).json({ erro: `Não foi possível acessar a URL (${response.status})` }); return; }
    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s{3,}/g, "\n").trim();
    if (text.length < 50) { res.status(422).json({ erro: "Não foi possível extrair conteúdo desta URL" }); return; }
    const docTitle = title || new URL(url).hostname;
    const tagsArr: string[] = typeof tags === "string" ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    const result = await saveDocumentWithChunks({
      title: docTitle, subject: subject ?? null, contentText: text.slice(0, 50000),
      uploadedBy: req.userId, sourceFile: url, tags: tagsArr,
    });
    res.json({ ok: true, message: "URL salva com sucesso!", ...result });
  } catch (err: any) {
    if (err.name === "AbortError") { res.status(422).json({ erro: "URL demorou muito para responder" }); }
    else { req.log.error({ err }, "Error uploading URL"); res.status(500).json({ erro: "Erro ao processar URL" }); }
  }
});

// ─── User: List their documents ───────────────────────────────────────────────
router.get("/knowledge/user-docs", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT id, title, subject, source_file, file_size_kb, page_count, tags,
        LEFT(content_text, 200) as preview, char_length(content_text) as content_length, created_at
      FROM knowledge_documents
      WHERE (is_chunk = false OR is_chunk IS NULL) AND uploaded_by = ${req.userId}
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ docs: rows.rows });
  } catch (err) { res.status(500).json({ erro: "Erro ao listar documentos" }); }
});

// ─── User: Delete their document ──────────────────────────────────────────────
router.delete("/knowledge/user-docs/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${id} AND uploaded_by = ${req.userId}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ erro: "Erro ao deletar" }); }
});

// ─── User: Search their documents ─────────────────────────────────────────────
router.get("/knowledge/user-search", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const q = String(req.query.q || "").trim();
  if (!q) { res.json({ results: [] }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT id, title, subject, source_file,
        ts_headline('portuguese', content_text, plainto_tsquery('portuguese', ${q}),
          'MaxWords=50, MinWords=15, StartSel=**, StopSel=**') as excerpt
      FROM knowledge_documents
      WHERE (is_chunk = false OR is_chunk IS NULL) AND uploaded_by = ${req.userId}
        AND (search_vector @@ plainto_tsquery('portuguese', ${q}) OR title ILIKE ${"%" + q + "%"})
      ORDER BY created_at DESC LIMIT 10
    `);
    res.json({ results: rows.rows });
  } catch (err) { res.status(500).json({ erro: "Erro na busca" }); }
});

export default router;
