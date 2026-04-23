/**
 * /api/notebook — StudyAI Notebook (RAG sem embeddings: busca textual robusta)
 *
 * Usa Replit AI Integrations proxy (GPT-4o-mini) para toda geração de texto.
 * RAG implementado com busca por palavras-chave + full-text search no Postgres.
 * Sem dependência de OPENAI_API_KEY ou DEEPSEEK_API_KEY.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { createRequire } from "module";
import OpenAI from "openai";
import multer from "multer";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { validateFileUpload } from "../middlewares/security";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { logAiUsage } from "../lib/aiCostLogger";

const _require = createRequire(import.meta.url);
const router: IRouter = Router();

// ─── AI client via Replit AI Integrations proxy ────────────────────────────
const _rawGpt = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Proxy that auto-logs token usage for every chat completion
const gpt = new Proxy(_rawGpt, {
  get(target, prop) {
    if (prop === "chat") {
      return new Proxy(target.chat, {
        get(chatTarget, chatProp) {
          if (chatProp === "completions") {
            return new Proxy(chatTarget.completions, {
              get(compTarget, compProp) {
                if (compProp === "create") {
                  return async (params: Parameters<typeof compTarget.create>[0], opts?: Parameters<typeof compTarget.create>[1]) => {
                    const result = await (compTarget.create as Function)(params, opts);
                    if (result && typeof result === "object" && "usage" in result && result.usage) {
                      logAiUsage({ feature: "notebook", model: (params as any).model ?? "gpt-4o-mini", tokensIn: (result as any).usage.prompt_tokens ?? 0, tokensOut: (result as any).usage.completion_tokens ?? 0 });
                    }
                    return result;
                  };
                }
                return (compTarget as any)[compProp];
              }
            });
          }
          return (chatTarget as any)[chatProp];
        }
      });
    }
    return (target as any)[prop];
  }
}) as OpenAI;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Multi-Notebook schema (cadernos) ─────────────────────────────────────────
let _schemaReady = false;
async function ensureNotebooksSchema() {
  if (_schemaReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notebooks (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      title VARCHAR(120) NOT NULL DEFAULT 'Caderno',
      persona TEXT DEFAULT '',
      goals TEXT DEFAULT '',
      color VARCHAR(20) DEFAULT 'indigo',
      emoji VARCHAR(8) DEFAULT '📘',
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Add columns that may be missing from older table versions
  await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS persona TEXT DEFAULT ''`);
  await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS goals TEXT DEFAULT ''`);
  await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT 'indigo'`);
  await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS emoji VARCHAR(8) DEFAULT '📘'`);
  await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false`);

  // Create indexes safely (avoids duplicate-key race conditions)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notebooks_user') THEN
        CREATE INDEX idx_notebooks_user ON notebooks(user_id);
      END IF;
    END $$
  `);

  await db.execute(sql`ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS notebook_id INTEGER`);

  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_knowdocs_notebook') THEN
        CREATE INDEX idx_knowdocs_notebook ON knowledge_documents(notebook_id);
      END IF;
    END $$
  `);

  // Artefatos gerados (slides, podcast, infografico, timeline, mapa-mental, etc.)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notebook_artifacts (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      doc_id INTEGER NOT NULL,
      kind VARCHAR(32) NOT NULL,
      title VARCHAR(255) DEFAULT '',
      payload JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artifacts_user_doc') THEN
        CREATE INDEX idx_artifacts_user_doc ON notebook_artifacts(user_id, doc_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_artifacts_kind') THEN
        CREATE INDEX idx_artifacts_kind ON notebook_artifacts(kind);
      END IF;
    END $$
  `);
  _schemaReady = true;
}

// ─── Salvar artefato gerado (best-effort, não bloqueia resposta se falhar) ────
async function saveArtifact(userId: string, docId: number, kind: string, title: string, payload: any) {
  try {
    await ensureNotebooksSchema();
    await db.execute(sql`
      INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
      VALUES (${userId}, ${docId}, ${kind}, ${title.slice(0, 250)}, ${JSON.stringify(payload)}::jsonb)
    `);
  } catch (e) {
    console.warn(`[saveArtifact ${kind}]`, e);
  }
}

async function getOrCreateDefaultNotebook(userId: string): Promise<number> {
  await ensureNotebooksSchema();
  const existing = await db.execute(sql`
    SELECT id FROM notebooks WHERE user_id = ${userId} AND is_default = true LIMIT 1
  `);
  if (existing.rows.length) return (existing.rows[0] as any).id;

  const created = await db.execute(sql`
    INSERT INTO notebooks (user_id, title, color, emoji, is_default)
    VALUES (${userId}, 'Caderno Padrão', 'indigo', '📘', true)
    RETURNING id
  `);
  const newId = (created.rows[0] as any).id as number;

  // Migra docs órfãos do usuário pro caderno padrão
  await db.execute(sql`
    UPDATE knowledge_documents
       SET notebook_id = ${newId}
     WHERE uploaded_by = ${userId} AND notebook_id IS NULL
  `);
  return newId;
}

async function resolveNotebookId(userId: string, raw: any): Promise<number> {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    const owns = await db.execute(sql`
      SELECT id FROM notebooks WHERE id = ${n} AND user_id = ${userId} LIMIT 1
    `);
    if (owns.rows.length) return n;
  }
  return getOrCreateDefaultNotebook(userId);
}

async function getNotebookContext(notebookId: number): Promise<{ persona: string; goals: string; title: string } | null> {
  const r = await db.execute(sql`
    SELECT title, persona, goals FROM notebooks WHERE id = ${notebookId} LIMIT 1
  `);
  if (!r.rows.length) return null;
  const row = r.rows[0] as any;
  return { title: row.title || "", persona: row.persona || "", goals: row.goals || "" };
}

// ─── Cadernos CRUD ────────────────────────────────────────────────────────────
router.get("/notebook/cadernos", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    await getOrCreateDefaultNotebook(req.userId);
    const r = await db.execute(sql`
      SELECT n.id, n.title, n.persona, n.goals, n.color, n.emoji, n.is_default,
             n.created_at, n.updated_at,
             (SELECT COUNT(*)::int FROM knowledge_documents
                WHERE notebook_id = n.id AND (is_chunk IS NULL OR is_chunk = false)) AS docs_count
      FROM notebooks n
      WHERE n.user_id = ${req.userId}
      ORDER BY n.is_default DESC, n.updated_at DESC
    `);
    res.json([...r.rows]);
  } catch (e) {
    req.log?.error({ err: e }, "list cadernos");
    res.status(500).json({ erro: "Erro ao listar cadernos" });
  }
});

router.post("/notebook/cadernos", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  await ensureNotebooksSchema();
  const { title, persona, goals, color, emoji } = req.body ?? {};
  if (!title?.trim()) { res.status(400).json({ erro: "Título obrigatório" }); return; }
  try {
    const r = await db.execute(sql`
      INSERT INTO notebooks (user_id, title, persona, goals, color, emoji)
      VALUES (${req.userId}, ${String(title).slice(0, 120)},
              ${String(persona ?? "").slice(0, 5000)},
              ${String(goals ?? "").slice(0, 5000)},
              ${color ?? 'indigo'}, ${emoji ?? '📘'})
      RETURNING id, title, persona, goals, color, emoji, is_default, created_at, updated_at
    `);
    res.json(r.rows[0]);
  } catch (e) {
    req.log?.error({ err: e }, "create caderno");
    res.status(500).json({ erro: "Erro ao criar caderno" });
  }
});

router.patch("/notebook/cadernos/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  const { title, persona, goals, color, emoji } = req.body ?? {};
  try {
    const r = await db.execute(sql`
      UPDATE notebooks SET
        title = COALESCE(${title ?? null}, title),
        persona = COALESCE(${persona ?? null}, persona),
        goals = COALESCE(${goals ?? null}, goals),
        color = COALESCE(${color ?? null}, color),
        emoji = COALESCE(${emoji ?? null}, emoji),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${req.userId}
      RETURNING id, title, persona, goals, color, emoji, is_default
    `);
    if (!r.rows.length) { res.status(404).json({ erro: "Caderno não encontrado" }); return; }
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: "Erro ao atualizar caderno" });
  }
});

router.delete("/notebook/cadernos/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    const check = await db.execute(sql`SELECT is_default FROM notebooks WHERE id = ${id} AND user_id = ${req.userId}`);
    if (!check.rows.length) { res.status(404).json({ erro: "Caderno não encontrado" }); return; }
    if ((check.rows[0] as any).is_default) { res.status(400).json({ erro: "Não é possível excluir o Caderno Padrão" }); return; }
    const def = await getOrCreateDefaultNotebook(req.userId);
    await db.execute(sql`UPDATE knowledge_documents SET notebook_id = ${def} WHERE notebook_id = ${id} AND uploaded_by = ${req.userId}`);
    await db.execute(sql`DELETE FROM notebooks WHERE id = ${id} AND user_id = ${req.userId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Erro ao excluir caderno" });
  }
});

// ─── Text extraction ──────────────────────────────────────────────────────────
async function extractText(file: Express.Multer.File): Promise<string> {
  const mime = file.mimetype;
  const name = (file.originalname ?? "").toLowerCase();

  if (mime === "text/plain" || name.endsWith(".txt") || name.endsWith(".md")) {
    return file.buffer.toString("utf8").slice(0, 200_000);
  }

  if (mime === "text/csv" || name.endsWith(".csv")) {
    const XLSX = _require("xlsx");
    const wb = XLSX.read(file.buffer, { type: "buffer" });
    const texts: string[] = [];
    for (const sheetName of wb.SheetNames as string[]) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      texts.push(`=== Planilha: ${sheetName} ===\n${csv}`);
    }
    return texts.join("\n\n").slice(0, 200_000);
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    name.endsWith(".xlsx") || name.endsWith(".xls")
  ) {
    const XLSX = _require("xlsx");
    const wb = XLSX.read(file.buffer, { type: "buffer" });
    const texts: string[] = [];
    for (const sheetName of wb.SheetNames as string[]) {
      const rows: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
      const rowTexts = rows.map((r: string[]) => r.join("\t")).filter((r: string) => r.trim());
      texts.push(`=== Planilha: ${sheetName} ===\n${rowTexts.join("\n")}`);
    }
    return texts.join("\n\n").slice(0, 200_000);
  }

  if (mime === "application/epub+zip" || name.endsWith(".epub")) {
    const AdmZip = _require("adm-zip");
    const zip = new AdmZip(file.buffer);
    const entries = zip.getEntries()
      .filter((e: any) => {
        const n = e.entryName.toLowerCase();
        return (n.endsWith(".xhtml") || n.endsWith(".html")) && !n.includes("nav") && !n.includes("toc");
      })
      .sort((a: any, b: any) => a.entryName.localeCompare(b.entryName));
    const texts = entries.map((e: any) => {
      const html = e.getData().toString("utf8");
      return html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s{2,}/g, " ").trim();
    }).filter((t: string) => t.length > 50);
    return texts.join("\n\n").slice(0, 200_000);
  }

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer: file.buffer });
    return r.value.slice(0, 200_000);
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    try {
      const pdfParser = _require("pdf-parse/lib/pdf-parse");
      const parsed = await pdfParser(file.buffer);
      return parsed.text.slice(0, 200_000);
    } catch {
      return file.buffer.toString("latin1")
        .replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ")
        .replace(/\s{3,}/g, "\n").trim().slice(0, 200_000);
    }
  }

  // PPTX: extract text from slide XML nodes
  if (
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.endsWith(".pptx")
  ) {
    const AdmZip = _require("adm-zip");
    const zip = new AdmZip(file.buffer);
    const slideEntries = zip.getEntries()
      .filter((e: any) => /ppt\/slides\/slide\d+\.xml/.test(e.entryName))
      .sort((a: any, b: any) => a.entryName.localeCompare(b.entryName));
    const texts = slideEntries.map((e: any) => {
      const xml = e.getData().toString("utf8");
      const matches = xml.match(/<a:t>([^<]+)<\/a:t>/g) ?? [];
      return matches.map((m: string) => m.replace(/<[^>]+>/g, "")).join(" ").trim();
    }).filter((t: string) => t.length > 5);
    return texts.join("\n\n").slice(0, 200_000);
  }

  return "";
}

// ─── Chunk text ───────────────────────────────────────────────────────────────
function chunkText(text: string, size = 800, overlap = 120): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 60) chunks.push(chunk);
    start += size - overlap;
  }
  return chunks;
}

// ─── Save doc + text chunks to DB (sem embeddings) ───────────────────────────
async function saveDocWithChunks(
  userId: string,
  title: string,
  contentText: string,
  sourceType: "pdf" | "text" | "url" | "youtube" | "wikipedia" | "audio" | "image" | "gdocs" | "xlsx" | "csv" | "epub",
  sourceRef?: string,
  fileSizeKb?: number,
  notebookId?: number,
): Promise<number> {
  const nbId = notebookId ?? await getOrCreateDefaultNotebook(userId);
  // 1. Save main doc
  const result = await db.execute(sql`
    INSERT INTO knowledge_documents (title, content_text, uploaded_by, source_file, file_size_kb, language, notebook_id)
    VALUES (${title}, ${contentText.slice(0, 100_000)}, ${userId}, ${sourceRef ?? null}, ${fileSizeKb ?? null}, 'pt', ${nbId})
    RETURNING id
  `);
  const docId = (result.rows[0] as any).id as number;

  // 2. Save chunks without embeddings (using notebook_embeddings table for compatibility)
  const chunks = chunkText(contentText);
  for (let i = 0; i < chunks.length; i++) {
    await db.execute(sql`
      INSERT INTO notebook_embeddings (user_id, doc_id, chunk_text, chunk_index, source_title)
      VALUES (${userId}, ${docId}, ${chunks[i]}, ${i}, ${title})
    `);
  }

  return docId;
}

// ─── RAG: keyword-based search ────────────────────────────────────────────────
async function ragSearch(
  userId: string,
  docIds: number[] | null,
  query: string,
  topK = 8,
): Promise<Array<{ text: string; title: string }>> {
  // Extract meaningful keywords
  const stopWords = new Set(["o","a","os","as","um","uma","de","da","do","e","que","em","para","com","por","se","me","te","nos","isso","isto","esse","esta","este","como","qual","quais","quando","onde","quem","não","sim","mais","mas","ou","é","foi","ser","ter","há","já","este","nesta","nesse","qual","seu","sua"]);
  const keywords = query
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);

  const docFilter = docIds && docIds.length > 0 ? `AND doc_id = ANY(ARRAY[${docIds.join(",")}]::int[])` : "";

  let queryStr: string;
  if (keywords.length === 0) {
    // No keywords — return first topK chunks
    queryStr = `
      SELECT chunk_text, source_title FROM notebook_embeddings
      WHERE user_id = $1 ${docFilter}
      ORDER BY chunk_index ASC LIMIT ${topK}
    `;
  } else {
    // Build ILIKE conditions for each keyword
    const ilikeConditions = keywords.map(kw => `chunk_text ILIKE '%${kw.replace(/'/g, "''")}%'`).join(" OR ");
    const scoreExpr = keywords.map(kw => `(CASE WHEN chunk_text ILIKE '%${kw.replace(/'/g, "''")}%' THEN 1 ELSE 0 END)`).join(" + ");
    queryStr = `
      SELECT chunk_text, source_title, (${scoreExpr}) as score
      FROM notebook_embeddings
      WHERE user_id = $1 ${docFilter} AND (${ilikeConditions})
      ORDER BY score DESC, chunk_index ASC LIMIT ${topK * 2}
    `;
  }

  const rows = await db.execute(sql.raw(queryStr.replace("$1", `'${userId.replace(/'/g, "''")}'`)));
  const results = rows.rows as any[];

  // Deduplicate
  const seen = new Set<string>();
  return results
    .filter(r => {
      const key = String(r.chunk_text).slice(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, topK)
    .map(r => ({ text: String(r.chunk_text), title: String(r.source_title ?? "Documento") }));
}

// ─── POST /api/notebook/upload-file ──────────────────────────────────────────
router.post("/notebook/upload-file", upload.single("file"), validateFileUpload, async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  if (!req.file) { res.status(400).json({ erro: "Arquivo obrigatório" }); return; }

  const title = (req.body.title as string) || req.file.originalname.replace(/\.[^.]+$/, "");
  const fname = req.file.originalname.toLowerCase();
  const srcType = fname.endsWith(".xlsx") || fname.endsWith(".xls") ? "xlsx"
    : fname.endsWith(".csv") ? "csv"
    : fname.endsWith(".epub") ? "epub"
    : "pdf";

  try {
    const text = await extractText(req.file);
    if (!text || text.length < 20) {
      res.status(400).json({ erro: "Não foi possível extrair texto do arquivo. Verifique se o arquivo tem conteúdo." });
      return;
    }
    const chunks = chunkText(text);
    const nbId = await resolveNotebookId(req.userId, req.body.cadernoId);
    const docId = await saveDocWithChunks(
      req.userId, title, text, srcType,
      req.file.originalname, Math.round(req.file.size / 1024), nbId,
    );
    res.json({ id: docId, title, chars: text.length, chunks: chunks.length, message: `✅ "${title}" adicionado — ${chunks.length} trechos indexados` });
  } catch (e) {
    console.error("notebook upload-file:", e);
    res.status(500).json({ erro: "Erro ao processar arquivo. Tente novamente." });
  }
});

// ─── POST /api/notebook/upload-text ──────────────────────────────────────────
router.post("/notebook/upload-text", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { title, content, cadernoId } = req.body as { title: string; content: string; cadernoId?: number };
  if (!title || !content) { res.status(400).json({ erro: "Título e conteúdo obrigatórios" }); return; }

  try {
    const chunks = chunkText(content);
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const docId = await saveDocWithChunks(req.userId, title, content, "text", undefined, undefined, nbId);
    res.json({ id: docId, title, chars: content.length, chunks: chunks.length, message: `✅ "${title}" adicionado` });
  } catch (e) {
    console.error("notebook upload-text:", e);
    res.status(500).json({ erro: "Erro ao processar texto" });
  }
});

// ─── POST /api/notebook/upload-url ───────────────────────────────────────────
router.post("/notebook/upload-url", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { url, title, cadernoId } = req.body as { url: string; title?: string; cadernoId?: number };
  if (!url) { res.status(400).json({ erro: "URL obrigatória" }); return; }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyAI/1.0)" },
    });
    clearTimeout(timeout);
    if (!r.ok) {
      res.status(422).json({ erro: `Não foi possível acessar a URL (código ${r.status})` });
      return;
    }
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 150_000);

    if (text.length < 100) {
      res.status(400).json({ erro: "Não foi possível extrair conteúdo desta URL" });
      return;
    }

    const docTitle = title || new URL(url).hostname;
    const chunks = chunkText(text);
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const docId = await saveDocWithChunks(req.userId, docTitle, text, "url", url, undefined, nbId);
    res.json({ id: docId, title: docTitle, chars: text.length, chunks: chunks.length, message: `✅ "${docTitle}" importado` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-url:", msg);
    if (msg.includes("abort")) { res.status(422).json({ erro: "URL demorou muito para responder (timeout de 15s)" }); }
    else { res.status(500).json({ erro: `Não foi possível acessar a URL: ${msg}` }); }
  }
});

// ─── GET /api/notebook/docs ───────────────────────────────────────────────────
router.get("/notebook/docs", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    const nbId = await resolveNotebookId(req.userId, req.query.cadernoId);
    const docs = await db.execute(sql`
      SELECT id, title, source_file, file_size_kb, notebook_id,
             created_at, LENGTH(content_text) as content_length
      FROM knowledge_documents
      WHERE uploaded_by = ${req.userId}
        AND notebook_id = ${nbId}
        AND (is_chunk IS NULL OR is_chunk = false)
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json([...docs.rows]);
  } catch (e) {
    res.status(500).json({ erro: "Erro ao buscar documentos" });
  }
});

// ─── DELETE /api/notebook/docs/:id ───────────────────────────────────────────
router.delete("/notebook/docs/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const docId = parseInt(req.params.id);
  if (isNaN(docId)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    await db.execute(sql`DELETE FROM notebook_embeddings WHERE doc_id = ${docId} AND user_id = ${req.userId}`);
    await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${docId} AND uploaded_by = ${req.userId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Erro ao deletar documento" });
  }
});

// ─── POST /api/notebook/upload-gdocs ─────────────────────────────────────────
router.post("/notebook/upload-gdocs", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { url, title, cadernoId } = req.body as { url: string; title?: string; cadernoId?: number };
  if (!url) { res.status(400).json({ erro: "Link do Google Docs obrigatório" }); return; }
  try {
    const m = url.match(/\/d\/([A-Za-z0-9_-]+)/);
    if (!m) { res.status(400).json({ erro: "Link inválido — use o link do Google Docs (formato /d/ID/...)" }); return; }
    const docId = m[1];
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const r = await fetch(exportUrl, { redirect: "follow" });
    if (!r.ok) { res.status(422).json({ erro: "Doc não está público — habilite 'Qualquer um com o link pode ver'" }); return; }
    const text = (await r.text()).trim();
    if (text.length < 50) { res.status(422).json({ erro: "Documento vazio ou inacessível" }); return; }

    const docTitle = title || `Google Docs — ${docId.slice(0, 8)}`;
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const newId = await saveDocWithChunks(req.userId, docTitle, text, "gdocs", url, undefined, nbId);
    res.json({ id: newId, title: docTitle, chars: text.length, message: `✅ Google Docs importado (${text.length} caracteres)` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-gdocs:", msg);
    res.status(500).json({ erro: `Erro ao importar Google Docs: ${msg}` });
  }
});

// ─── POST /api/notebook/chat ──────────────────────────────────────────────────
// ─── POST /api/notebook/upload-youtube ───────────────────────────────────────
router.post("/notebook/upload-youtube", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { url, title, cadernoId } = req.body as { url: string; title?: string; cadernoId?: number };
  if (!url) { res.status(400).json({ erro: "URL do YouTube obrigatória" }); return; }
  try {
    const idMatch = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (!idMatch) { res.status(400).json({ erro: "URL do YouTube inválida" }); return; }
    const videoId = idMatch[1];

    const { YoutubeTranscript } = _require("youtube-transcript");
    let segments: Array<{ text: string }> = [];
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "pt" });
    } catch {
      try { segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "pt-BR" }); }
      catch { segments = await YoutubeTranscript.fetchTranscript(videoId); }
    }
    const text = segments.map(s => s.text).join(" ").replace(/\s{2,}/g, " ").trim();
    if (text.length < 50) { res.status(422).json({ erro: "Vídeo sem legendas disponíveis" }); return; }

    const docTitle = title || `YouTube — ${videoId}`;
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const docId = await saveDocWithChunks(req.userId, docTitle, text, "youtube", url, undefined, nbId);
    res.json({ id: docId, title: docTitle, chars: text.length, message: `✅ Transcrição importada (${text.length} caracteres)` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-youtube:", msg);
    res.status(500).json({ erro: `Não foi possível obter a transcrição: ${msg}` });
  }
});

// ─── POST /api/notebook/upload-wikipedia ─────────────────────────────────────
router.post("/notebook/upload-wikipedia", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { titulo, cadernoId } = req.body as { titulo: string; cadernoId?: number };
  if (!titulo?.trim()) { res.status(400).json({ erro: "Título do artigo obrigatório" }); return; }
  try {
    const t = encodeURIComponent(titulo.trim().replace(/ /g, "_"));
    const r = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=${t}&origin=*`);
    if (!r.ok) { res.status(422).json({ erro: "Wikipedia indisponível" }); return; }
    const data: any = await r.json();
    const pages = data?.query?.pages || {};
    const page: any = Object.values(pages)[0];
    if (!page || page.missing !== undefined) { res.status(404).json({ erro: "Artigo não encontrado" }); return; }
    const text = (page.extract || "").trim();
    if (text.length < 100) { res.status(422).json({ erro: "Artigo muito curto ou vazio" }); return; }

    const docTitle = `Wikipedia — ${page.title || titulo}`;
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const docId = await saveDocWithChunks(req.userId, docTitle, text, "wikipedia", `https://pt.wikipedia.org/wiki/${t}`, undefined, nbId);
    res.json({ id: docId, title: docTitle, chars: text.length, message: `✅ Artigo "${page.title}" importado` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-wikipedia:", msg);
    res.status(500).json({ erro: `Erro ao buscar artigo: ${msg}` });
  }
});

// ─── POST /api/notebook/upload-audio ─────────────────────────────────────────
router.post("/notebook/upload-audio", upload.single("audio"), async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const file = req.file;
  if (!file) { res.status(400).json({ erro: "Arquivo de áudio obrigatório" }); return; }
  try {
    const audioFile = new File([file.buffer], file.originalname || "audio.m4a", { type: file.mimetype || "audio/m4a" });
    const transcription = await gpt.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "pt",
    });
    const text = (transcription.text || "").trim();
    if (text.length < 20) { res.status(422).json({ erro: "Áudio sem fala detectável" }); return; }

    const docTitle = (req.body?.title as string) || file.originalname || "Áudio transcrito";
    const cadernoId = req.body?.cadernoId;
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const docId = await saveDocWithChunks(req.userId, docTitle, text, "audio", file.originalname, Math.round(file.size / 1024), nbId);
    res.json({ id: docId, title: docTitle, chars: text.length, message: `✅ Áudio transcrito (${text.length} caracteres)` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-audio:", msg);
    res.status(500).json({ erro: `Erro ao transcrever áudio: ${msg}` });
  }
});

// ─── POST /api/notebook/upload-image ─────────────────────────────────────────
router.post("/notebook/upload-image", upload.single("image"), async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const file = req.file;
  if (!file) { res.status(400).json({ erro: "Arquivo de imagem obrigatório" }); return; }
  try {
    const b64 = file.buffer.toString("base64");
    const mime = file.mimetype || "image/jpeg";
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2500,
      messages: [
        { role: "system", content: "Você extrai TODO o texto visível na imagem (OCR), preservando estrutura, parágrafos, listas, fórmulas. Se for diagrama/gráfico, descreva exaustivamente. Responda apenas com o conteúdo extraído, sem comentários." },
        { role: "user", content: [
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}`, detail: "high" } },
          { type: "text", text: "Extraia o conteúdo desta imagem em texto estruturado, em português." },
        ]},
      ],
    });
    const text = (completion.choices[0]?.message?.content || "").trim();
    if (text.length < 20) { res.status(422).json({ erro: "Não foi possível extrair texto da imagem" }); return; }

    const docTitle = (req.body?.title as string) || file.originalname || "Imagem (OCR)";
    const cadernoId = req.body?.cadernoId;
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const docId = await saveDocWithChunks(req.userId, docTitle, text, "image", file.originalname, Math.round(file.size / 1024), nbId);
    res.json({ id: docId, title: docTitle, chars: text.length, message: `✅ Texto extraído da imagem (${text.length} caracteres)` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-image:", msg);
    res.status(500).json({ erro: `Erro ao processar imagem: ${msg}` });
  }
});

router.post("/notebook/chat", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { pergunta, docIds, cadernoId } = req.body as { pergunta: string; docIds?: number[]; cadernoId?: number };
  if (!pergunta?.trim()) { res.status(400).json({ erro: "Pergunta obrigatória" }); return; }

  try {
    // Persona/goals do caderno (se houver)
    let personaBlock = "";
    if (cadernoId) {
      const nbId = await resolveNotebookId(req.userId, cadernoId);
      const ctx = await getNotebookContext(nbId);
      if (ctx && (ctx.persona || ctx.goals)) {
        personaBlock = `\n\nCONTEXTO DO CADERNO "${ctx.title}":\n${ctx.persona ? `Persona/foco: ${ctx.persona.slice(0, 2000)}` : ""}${ctx.goals ? `\nObjetivos do aluno: ${ctx.goals.slice(0, 2000)}` : ""}\nUse este contexto para personalizar a explicação (nível, exemplos, prioridades).`;
      }
    }
    const chunks = await ragSearch(req.userId, docIds?.length ? docIds : null, pergunta, 8);

    if (!chunks.length) {
      res.json({
        resposta: "Não encontrei documentos para responder. Adicione pelo menos um documento primeiro usando os botões de PDF, Texto ou URL.",
        fontes: [],
      });
      return;
    }

    const context = chunks
      .map((c, i) => `[Fonte ${i + 1} — "${c.title}"]\n${c.text}`)
      .join("\n\n---\n\n");

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão, assistente de estudos especialista em preparação para ENEM e vestibulares brasileiros.
Responda em português brasileiro, de forma clara, didática e objetiva.
Use EXCLUSIVAMENTE as fontes abaixo para responder. Não invente informações.
Cite as fontes usando [Fonte N] quando usar uma informação específica.
Se a pergunta não puder ser respondida com base nas fontes, diga isso claramente.
Ao final, se relevante, acrescente uma dica específica sobre como esse tema cai no ENEM.${personaBlock}

FONTES DISPONÍVEIS:
${context}`,
        },
        { role: "user", content: pergunta },
      ],
    });

    const resposta = completion.choices[0].message.content ?? "";

    // Build unique sources cited — keep FULL trecho for clickable citations
    const fontesCitadas = new Map<number, { numero: number; titulo: string; trecho: string; trechoCompleto: string }>();
    const fonteRegex = /\[Fonte (\d+)\]/g;
    let match;
    while ((match = fonteRegex.exec(resposta)) !== null) {
      const n = parseInt(match[1]);
      if (chunks[n - 1] && !fontesCitadas.has(n)) {
        const full = chunks[n - 1].text;
        fontesCitadas.set(n, {
          numero: n,
          titulo: chunks[n - 1].title,
          trecho: full.slice(0, 200) + (full.length > 200 ? "…" : ""),
          trechoCompleto: full,
        });
      }
    }

    // If no citations detected, show all sources used
    const fontes = fontesCitadas.size > 0
      ? Array.from(fontesCitadas.values())
      : chunks.slice(0, 3).map((c, i) => ({
          numero: i + 1,
          titulo: c.title,
          trecho: c.text.slice(0, 200) + (c.text.length > 200 ? "…" : ""),
          trechoCompleto: c.text,
        }));

    res.json({ resposta, fontes });
  } catch (e) {
    console.error("notebook chat:", e);
    res.status(500).json({ erro: "Erro ao processar pergunta. Verifique sua conexão e tente novamente." });
  }
});

// ─── POST /api/notebook/chat-stream (SSE streaming) ──────────────────────────
router.post("/notebook/chat-stream", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { pergunta, docIds, cadernoId } = req.body as { pergunta: string; docIds?: number[]; cadernoId?: number };
  if (!pergunta?.trim()) { res.status(400).json({ erro: "Pergunta obrigatória" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let personaBlock = "";
    if (cadernoId) {
      const nbId = await resolveNotebookId(req.userId, cadernoId);
      const ctx = await getNotebookContext(nbId);
      if (ctx && (ctx.persona || ctx.goals)) {
        personaBlock = `\n\nCONTEXTO DO CADERNO "${ctx.title}":\n${ctx.persona ? `Persona/foco: ${ctx.persona.slice(0, 2000)}` : ""}${ctx.goals ? `\nObjetivos do aluno: ${ctx.goals.slice(0, 2000)}` : ""}\nUse este contexto para personalizar a explicação.`;
      }
    }

    const chunks = await ragSearch(req.userId, docIds?.length ? docIds : null, pergunta, 8);
    if (!chunks.length) {
      send("chunk", { text: "Não encontrei documentos para responder. Adicione pelo menos uma fonte primeiro." });
      send("done", { fontes: [] });
      res.end();
      return;
    }

    const context = chunks.map((c, i) => `[Fonte ${i + 1} — "${c.title}"]\n${c.text}`).join("\n\n---\n\n");

    // Send sources index up-front so frontend can render placeholders
    send("sources", chunks.map((c, i) => ({
      numero: i + 1,
      titulo: c.title,
      trecho: c.text.slice(0, 200) + (c.text.length > 200 ? "…" : ""),
      trechoCompleto: c.text,
    })));

    const stream = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1500,
      stream: true,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão, assistente de estudos para ENEM e vestibulares brasileiros.
Responda em português brasileiro, claro e didático.
Use EXCLUSIVAMENTE as fontes abaixo. Não invente.
Cite fontes com [Fonte N] sempre que usar uma informação específica.
Se não puder responder com base nas fontes, diga claramente.${personaBlock}

FONTES DISPONÍVEIS:
${context}`,
        },
        { role: "user", content: pergunta },
      ],
    });

    let full = "";
    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content || "";
      if (delta) {
        full += delta;
        send("chunk", { text: delta });
      }
    }

    // Build cited sources from final text
    const fontesCitadas = new Map<number, { numero: number; titulo: string; trecho: string; trechoCompleto: string }>();
    const fonteRegex = /\[Fonte (\d+)\]/g;
    let match;
    while ((match = fonteRegex.exec(full)) !== null) {
      const n = parseInt(match[1]);
      if (chunks[n - 1] && !fontesCitadas.has(n)) {
        const ftext = chunks[n - 1].text;
        fontesCitadas.set(n, {
          numero: n,
          titulo: chunks[n - 1].title,
          trecho: ftext.slice(0, 200) + (ftext.length > 200 ? "…" : ""),
          trechoCompleto: ftext,
        });
      }
    }
    const fontes = fontesCitadas.size > 0
      ? Array.from(fontesCitadas.values())
      : chunks.slice(0, 3).map((c, i) => ({
          numero: i + 1,
          titulo: c.title,
          trecho: c.text.slice(0, 200) + (c.text.length > 200 ? "…" : ""),
          trechoCompleto: c.text,
        }));

    send("done", { fontes });
    res.end();
  } catch (e) {
    console.error("notebook chat-stream:", e);
    send("error", { erro: "Erro ao processar pergunta" });
    res.end();
  }
});

// ─── POST /api/notebook/overview ─────────────────────────────────────────────
router.post("/notebook/overview", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    // Cache check
    const cached = await db.execute(sql`
      SELECT summary, key_topics, faq FROM notebook_overviews
      WHERE user_id = ${req.userId} AND doc_id = ${docId}
      LIMIT 1
    `);
    const cachedRow = (cached.rows as any[])[0];
    if (cachedRow?.summary) {
      res.json({
        summary: cachedRow.summary,
        keyTopics: typeof cachedRow.key_topics === "string" ? JSON.parse(cachedRow.key_topics) : cachedRow.key_topics,
        faq: typeof cachedRow.faq === "string" ? JSON.parse(cachedRow.faq) : cachedRow.faq,
      });
      return;
    }

    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId}
      LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `Analise o documento e retorne APENAS um JSON válido, sem markdown:
{
  "summary": "Resumo em 3-5 frases claras e didáticas do que o documento trata",
  "keyTopics": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5", "tópico 6"],
  "faq": [
    { "q": "Pergunta sobre o conteúdo?", "a": "Resposta concisa e direta" }
  ]
}
Gere 5-6 tópicos-chave e 5 perguntas frequentes relevantes para estudo.
Foco em preparação para ENEM/vestibular.`,
        },
        { role: "user", content: `Título: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    // Cache
    try {
      await db.execute(sql`
        INSERT INTO notebook_overviews (user_id, doc_id, summary, key_topics, faq)
        VALUES (${req.userId}, ${docId}, ${parsed.summary}, ${JSON.stringify(parsed.keyTopics)}, ${JSON.stringify(parsed.faq)})
        ON CONFLICT DO NOTHING
      `);
    } catch { /* cache non-critical */ }

    res.json({ summary: parsed.summary, keyTopics: parsed.keyTopics, faq: parsed.faq });
  } catch (e) {
    console.error("notebook overview:", e);
    res.status(500).json({ erro: "Erro ao gerar visão geral" });
  }
});

// ─── POST /api/notebook/study-guide ──────────────────────────────────────────
router.post("/notebook/study-guide", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você é professor especialista em ENEM e vestibulares. Crie um guia de estudo completo.
Retorne APENAS JSON válido, sem markdown:
{
  "titulo": "Guia de Estudo: [assunto]",
  "introducao": "Frase motivacional sobre o tema",
  "questoes": [
    {
      "tipo": "conceito|aplicacao|comparacao|analise",
      "pergunta": "Pergunta de estudo profunda?",
      "resposta": "Resposta detalhada com exemplos do mundo real",
      "dicaEnem": "Como e com que frequência esse tema cai no ENEM"
    }
  ],
  "cronogramaSugerido": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ..."]
}
Gere 8-10 questões variadas cobrindo todo o documento.`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook study-guide:", e);
    res.status(500).json({ erro: "Erro ao gerar guia de estudo" });
  }
});

// ─── POST /api/notebook/flashcards ───────────────────────────────────────────
router.post("/notebook/flashcards", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, quantidade = 15 } = req.body as { docId: number; quantidade?: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Crie ${quantidade} flashcards de estudo de alta qualidade. Retorne APENAS JSON:
{"flashcards": [
  {"frente": "Pergunta clara e específica", "verso": "Resposta completa com contexto e exemplos", "materia": "área do conhecimento", "dificuldade": "facil|medio|dificil"}
]}
Varie a dificuldade (40% fácil, 40% médio, 20% difícil). Priorize o que cai no ENEM.`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook flashcards:", e);
    res.status(500).json({ erro: "Erro ao gerar flashcards" });
  }
});

// ─── POST /api/notebook/questoes ─────────────────────────────────────────────
router.post("/notebook/questoes", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, quantidade = 5 } = req.body as { docId: number; quantidade?: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Crie ${quantidade} questões no estilo exato do ENEM (5 alternativas A-E, contextualização prévia, linguagem formal). Retorne APENAS JSON:
{"questoes": [
  {
    "enunciado": "Contexto + enunciado completo no estilo ENEM",
    "alternativas": {"A": "texto", "B": "texto", "C": "texto", "D": "texto", "E": "texto"},
    "gabarito": "A",
    "explicacao": "Explicação detalhada de por que a resposta é correta e por que as outras estão erradas"
  }
]}`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook questoes:", e);
    res.status(500).json({ erro: "Erro ao gerar questões" });
  }
});

// ─── POST /api/notebook/mapa-mental ──────────────────────────────────────────
router.post("/notebook/mapa-mental", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Você cria mapas mentais HIERÁRQUICOS de 4 níveis no estilo NotebookLM.
Retorne APENAS JSON válido com esta estrutura:
{
  "subject": "Tema central curto (max 4 palavras)",
  "categories": [
    {
      "name": "Categoria nível 2 (max 4 palavras)",
      "topics": [
        {
          "name": "Tópico nível 3 (max 5 palavras)",
          "subtopics": [
            { "name": "Subtópico folha (max 6 palavras)", "detail": "1-2 frases explicando" }
          ]
        }
      ]
    }
  ]
}
Regras OBRIGATÓRIAS:
- 2 a 4 categorias principais
- 2 a 5 tópicos por categoria
- 3 a 6 subtópicos por tópico
- Nomes CURTOS, sem pontuação final
- Detail factual extraído do documento (sem inventar)
- Estrutura limpa, hierárquica, sem repetição entre níveis
- NÃO inclua cores (frontend define paleta)`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 16_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    // Backward-compat: se vier no formato antigo (topics direto), envelopa em uma categoria
    if (parsed.topics && !parsed.categories) {
      parsed.categories = [{ name: parsed.subject, topics: parsed.topics }];
    }
    res.json(parsed);
  } catch (e) {
    console.error("notebook mapa-mental:", e);
    res.status(500).json({ erro: "Erro ao gerar mapa mental" });
  }
});

// ─── POST /api/notebook/podcast ──────────────────────────────────────────────
// Feature exclusiva: Geração de roteiro de podcast educativo (como NotebookLM Audio Overview)
router.post("/notebook/podcast", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Você vai criar um roteiro de podcast educativo em português brasileiro, estilo conversa natural entre dois apresentadores:
- ANA: professora entusiasta, explica conceitos de forma clara e usa analogias
- MARCOS: estudante curioso do ENEM, faz perguntas inteligentes, às vezes surpreso com descobertas

Retorne APENAS JSON válido:
{
  "titulo": "Título do episódio (criativo e envolvente)",
  "subtitulo": "Matéria | Nível: ENEM/Vestibular",
  "duracao": "XX minutos (estimado)",
  "roteiro": [
    { "speaker": "ANA", "fala": "texto natural da fala" },
    { "speaker": "MARCOS", "fala": "texto natural da fala" }
  ],
  "destaques": ["ponto chave 1", "ponto chave 2", "ponto chave 3"]
}

O roteiro deve:
- Ter 12-18 falas alternando entre os dois
- Começar com uma introdução cativante que desperta curiosidade
- Cobrir os principais conceitos do documento de forma progressiva
- Incluir perguntas retóricas, exemplos cotidianos e conexões com o ENEM
- Terminar com um resumo dos pontos principais e dica de estudo
- Usar linguagem natural, não formal — como um podcast real`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 15_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    await saveArtifact(req.userId, docId, "podcast", parsed.titulo ?? row.title, parsed);
    res.json(parsed);
  } catch (e) {
    console.error("notebook podcast:", e);
    res.status(500).json({ erro: "Erro ao gerar podcast" });
  }
});

// ─── POST /api/notebook/tiagao-explica ───────────────────────────────────────
router.post("/notebook/tiagao-explica", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão. Crie uma aula completa na lousa sobre o documento.
Retorne APENAS JSON válido:
{
  "titulo": "Título da aula",
  "subtitulo": "Foco ENEM",
  "etapas": [
    {
      "id": 1,
      "narracao": "4-6 frases didáticas, animadas e diretas em PT-BR",
      "elementos": [
        {"tipo": "titulo", "texto": "string", "cor": "#1e1b4b"},
        {"tipo": "texto", "texto": "explicação completa e clara"},
        {"tipo": "destaque", "texto": "conceito-chave importante", "cor": "#bbf7d0", "corTexto": "#166534"},
        {"tipo": "exemplo", "texto": "exemplo concreto do mundo real", "cor": "#dbeafe"},
        {"tipo": "seta", "texto": "→ ponto importante para lembrar", "cor": "#6366f1"}
      ],
      "duracao": 30
    }
  ]
}
Gere 4-5 etapas cobrindo todo o conteúdo de forma progressiva.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const aula = JSON.parse(clean);

    res.json({ aula, titulo: row.title });
  } catch (e) {
    console.error("notebook tiagao-explica:", e);
    res.status(500).json({ erro: "Erro ao gerar aula" });
  }
});

// ─── POST /api/notebook/timeline ─────────────────────────────────────────────
router.post("/notebook/timeline", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão. Extraia uma LINHA DO TEMPO cronológica do documento.
Útil para História, Biologia (evolução), Química (descobertas), Literatura (escolas literárias), etc.
Se o documento não tiver natureza cronológica clara, infira marcos temáticos progressivos.
Retorne APENAS JSON válido:
{
  "titulo": "Título da linha do tempo",
  "tema": "tema principal",
  "eventos": [
    {
      "data": "1500" ou "Século XIX" ou "Etapa 1",
      "titulo": "Nome curto do evento",
      "descricao": "2-3 frases didáticas explicando o evento",
      "importancia": "alta" | "media" | "baixa",
      "categoria": "string curta (ex: Político, Cultural, Científico)",
      "dicaEnem": "frase curta sobre como cai no ENEM (opcional)"
    }
  ]
}
Gere 6-12 eventos em ordem cronológica.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const timeline = JSON.parse(clean);

    await saveArtifact(req.userId, docId, "timeline", timeline.titulo ?? row.title, { timeline });
    res.json({ timeline });
  } catch (e) {
    console.error("notebook timeline:", e);
    res.status(500).json({ erro: "Erro ao gerar linha do tempo" });
  }
});

// ─── POST /api/notebook/infografico ──────────────────────────────────────────
// Gera infográfico visual profissional a partir do documento (estilo NotebookLM)
router.post("/notebook/infografico", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, estilo = "profissional", orientacao = "quadrado" } = req.body as {
    docId: number;
    estilo?: "kawaii" | "profissional" | "cientifico" | "anime" | "esboco" | "minimalista";
    orientacao?: "quadrado" | "paisagem" | "retrato";
  };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    // Step 1: extract a tight visual brief from the document
    const briefCompletion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `Você é diretor de arte criando um briefing visual para um infográfico educacional profissional.
Retorne APENAS JSON:
{
  "titulo": "Título principal curto (max 8 palavras)",
  "subtitulo": "Subtítulo explicativo (max 15 palavras)",
  "secoes": [
    { "rotulo": "Nome da seção (max 4 palavras)", "elementos": ["fato 1 curto", "fato 2 curto", "fato 3 curto"] }
  ],
  "paleta_sugerida": ["#hex1", "#hex2", "#hex3"],
  "icones_chave": ["substantivo concreto 1", "substantivo concreto 2", "substantivo concreto 3"]
}
Regras:
- 2 a 4 seções principais (lados do infográfico)
- 3 a 5 elementos por seção, MUITO concisos
- Ícones devem ser objetos visuais concretos (não conceitos abstratos)`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });
    const briefRaw = briefCompletion.choices[0].message.content ?? "{}";
    const brief = JSON.parse(briefRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

    // Step 2: build the image generation prompt with style
    const styleSheet: Record<string, string> = {
      kawaii: "ultra cute kawaii illustration style, pastel colors (mint, pink, lavender, cream), soft rounded shapes, smiling characters with rosy cheeks, hand-drawn outlines, sparkles and hearts, friendly playful mood",
      profissional: "modern flat infographic design, clean vector illustration, balanced composition, corporate-friendly palette (deep blue, teal, warm orange accents), clear typography, professional editorial style, business magazine quality",
      cientifico: "academic scientific diagram style, precise technical illustration, labeled anatomical or molecular illustrations, muted scholarly palette (navy, sage, ochre, ivory), textbook quality, accurate proportions",
      anime: "Japanese anime / manga educational poster style, vibrant cel-shaded illustrations, expressive characters, dynamic composition, bold colors, manga panel inspired layout",
      esboco: "hand-drawn pencil sketch infographic, doodle bullet journal aesthetic, monochromatic with accent watercolor washes, handwritten labels, paper texture, cozy notebook feel",
      minimalista: "minimalist line-art infographic, ultra clean, lots of whitespace, single accent color on neutral background, geometric shapes, Swiss design influence, sophisticated and calm",
    };
    const styleDesc = styleSheet[estilo] ?? styleSheet.profissional;

    const sectionsText = (brief.secoes ?? []).map((s: any, i: number) =>
      `${i + 1}. "${s.rotulo}": ${(s.elementos ?? []).join(" / ")}`
    ).join("\n");

    const prompt = `Create a professional educational infographic poster IN BRAZILIAN PORTUGUESE.

STYLE: ${styleDesc}

TITLE (large, top center): "${brief.titulo}"
SUBTITLE (below title): "${brief.subtitulo}"

LAYOUT: ${(brief.secoes?.length ?? 2) <= 2 ? "two side-by-side columns separated by a vertical divider" : "grid of 3-4 quadrants with clear section boundaries"}

SECTIONS to display (each with its own visual area, label as a header pill, and bulleted facts):
${sectionsText}

VISUAL ELEMENTS to include: ${(brief.icones_chave ?? []).join(", ")}

REQUIREMENTS:
- All text MUST be in Brazilian Portuguese, clearly legible, no spelling errors
- Use the title exactly as written
- Each section labeled with its rotulo as a colored badge or header
- Include illustrative icons or characters that represent the topic
- Cohesive color palette throughout
- Bottom right corner: small "StudyAI" watermark
- High visual hierarchy: title is dominant, sections have equal weight
- DO NOT include lorem ipsum or filler text — use the exact facts provided`;

    const sizeMap: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
      quadrado: "1024x1024",
      paisagem: "1536x1024",
      retrato: "1024x1536",
    };
    const size = sizeMap[orientacao] ?? "1024x1024";

    const buffer = await generateImageBuffer(prompt, size);
    const b64_json = buffer.toString("base64");

    const result = {
      b64_json,
      mimeType: "image/png",
      titulo: brief.titulo,
      subtitulo: brief.subtitulo,
      estilo,
      orientacao,
    };
    await saveArtifact(req.userId, docId, "infografico", brief.titulo ?? row.title, result);
    res.json(result);
  } catch (e: any) {
    console.error("notebook infografico:", e);
    res.status(500).json({ erro: e.message ?? "Erro ao gerar infográfico" });
  }
});

// ─── POST /api/notebook/slides ───────────────────────────────────────────────
router.post("/notebook/slides", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão criando uma APRESENTAÇÃO PROFISSIONAL em slides sobre o documento.
Pense como um designer de slides do NotebookLM: títulos curtos, hierarquia clara, bullets concisos.
Retorne APENAS JSON válido:
{
  "titulo": "Título da apresentação (≤ 8 palavras)",
  "subtitulo": "Subtítulo de uma linha",
  "autor": "Professor Tiagão",
  "tema": "indigo" | "rose" | "emerald" | "amber",
  "slides": [
    {
      "tipo": "capa",
      "titulo": "string",
      "subtitulo": "string",
      "icone": "BookOpen"
    },
    {
      "tipo": "agenda",
      "titulo": "Agenda",
      "itens": ["item 1", "item 2", "item 3"]
    },
    {
      "tipo": "conteudo",
      "titulo": "string (≤ 6 palavras)",
      "subtitulo": "string opcional",
      "bullets": ["frase curta e potente", "outra frase", "..."],
      "destaque": "frase de impacto opcional"
    },
    {
      "tipo": "comparacao",
      "titulo": "string",
      "esquerda": {"titulo": "string", "itens": ["..."]},
      "direita": {"titulo": "string", "itens": ["..."]}
    },
    {
      "tipo": "citacao",
      "texto": "citação direta do material",
      "autor": "string opcional"
    },
    {
      "tipo": "encerramento",
      "titulo": "Conclusão",
      "mensagem": "frase final de uma linha",
      "dicaEnem": "como esse tema cai no ENEM"
    }
  ]
}
Gere 8-12 slides total. Comece com "capa", inclua 1 "agenda", varie os tipos, termine com "encerramento".
Bullets devem ser FRASES CURTAS (máx 12 palavras), nunca parágrafos.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const apresentacao = JSON.parse(clean);

    // Generate cover hero image in background (non-blocking is hard in Express; do inline ~8s)
    try {
      const coverPrompt = `Editorial magazine cover illustration for an educational presentation IN BRAZILIAN PORTUGUESE titled "${apresentacao.titulo}".
Style: clean modern flat design, sophisticated color palette matching the theme "${apresentacao.tema || "indigo"}", balanced composition, no readable text in image (we'll overlay it), abstract conceptual visual representing the subject. Professional editorial quality, suitable for a NotebookLM-style slide deck cover.`;
      const coverBuf = await generateImageBuffer(coverPrompt, "1536x1024");
      apresentacao.capaImagem = `data:image/png;base64,${coverBuf.toString("base64")}`;
    } catch (imgErr) {
      console.warn("Cover image generation failed:", imgErr);
    }

    await saveArtifact(req.userId, docId, "slides", apresentacao.titulo ?? row.title, { apresentacao, titulo: row.title });
    res.json({ apresentacao, titulo: row.title });
  } catch (e) {
    console.error("notebook slides:", e);
    res.status(500).json({ erro: "Erro ao gerar apresentação" });
  }
});

// ─── GET /api/notebook/docs/:docId/artifacts ─────────────────────────────────
// Lista artefatos previamente gerados para o documento (ordenados do mais recente)
router.get("/notebook/docs/:docId/artifacts", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const docId = Number(req.params.docId);
  if (!Number.isFinite(docId)) { res.status(400).json({ erro: "docId inválido" }); return; }
  try {
    await ensureNotebooksSchema();
    const owns = await db.execute(sql`
      SELECT id FROM knowledge_documents WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    if (!owns.rows.length) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const rows = await db.execute(sql`
      SELECT id, kind, title, created_at
        FROM notebook_artifacts
       WHERE user_id = ${req.userId} AND doc_id = ${docId}
       ORDER BY created_at DESC
       LIMIT 50
    `);
    res.json({ artifacts: rows.rows });
  } catch (e) {
    console.error("notebook artifacts list:", e);
    res.status(500).json({ erro: "Erro ao listar artefatos" });
  }
});

// ─── GET /api/notebook/artifacts/:id ─────────────────────────────────────────
// Recupera o payload completo de um artefato (para reabrir slides, podcast etc.)
router.get("/notebook/artifacts/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ erro: "id inválido" }); return; }
  try {
    await ensureNotebooksSchema();
    const rows = await db.execute(sql`
      SELECT id, doc_id, kind, title, payload, created_at
        FROM notebook_artifacts
       WHERE id = ${id} AND user_id = ${req.userId}
       LIMIT 1
    `);
    const row = (rows.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Artefato não encontrado" }); return; }
    res.json(row);
  } catch (e) {
    console.error("notebook artifact get:", e);
    res.status(500).json({ erro: "Erro ao carregar artefato" });
  }
});

// ─── DELETE /api/notebook/artifacts/:id ──────────────────────────────────────
router.delete("/notebook/artifacts/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ erro: "id inválido" }); return; }
  try {
    await ensureNotebooksSchema();
    await db.execute(sql`DELETE FROM notebook_artifacts WHERE id = ${id} AND user_id = ${req.userId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("notebook artifact delete:", e);
    res.status(500).json({ erro: "Erro ao remover artefato" });
  }
});

// ─── POST /api/notebook/slides/imagem ────────────────────────────────────────
// Gera imagem para um slide específico sob demanda
router.post("/notebook/slides/imagem", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { titulo, bullets = [], tema = "indigo" } = req.body as {
    titulo: string; bullets?: string[]; tema?: string;
  };
  try {
    const prompt = `Editorial illustration for a presentation slide titled "${titulo}".
Context bullets: ${bullets.slice(0, 3).join(" / ")}
Style: clean modern flat vector illustration, sophisticated palette matching "${tema}" theme (no text overlay), abstract conceptual representation, white or soft background, professional NotebookLM-quality. Make it visually striking and educational.`;
    const buf = await generateImageBuffer(prompt, "1536x1024");
    res.json({ imagem: `data:image/png;base64,${buf.toString("base64")}` });
  } catch (e: any) {
    console.error("slide imagem:", e);
    res.status(500).json({ erro: e.message ?? "Erro ao gerar imagem" });
  }
});

// ─── POST /api/notebook/suggest-questions ────────────────────────────────────
router.post("/notebook/suggest-questions", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docIds, cadernoId } = req.body as { docIds?: number[]; cadernoId?: number };
  try {
    const chunks = await ragSearch(req.userId, docIds?.length ? docIds : null, "principais tópicos conceitos", 6);
    if (!chunks.length) { res.json({ perguntas: [] }); return; }
    const context = chunks.map(c => c.text).join("\n\n").slice(0, 3000);
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.7, max_tokens: 350,
      messages: [
        { role: "system", content: "Você é assistente de estudos. Com base no contexto, gere EXATAMENTE 5 perguntas inteligentes e específicas que um estudante faria. Retorne APENAS JSON array de strings, sem explicações." },
        { role: "user", content: `Contexto:\n${context}\n\nGere 5 perguntas em PT-BR.` }
      ],
    });
    const text = completion.choices[0].message.content ?? "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const perguntas = match ? JSON.parse(match[0]) : [];
    res.json({ perguntas: perguntas.slice(0, 5) });
  } catch (e) {
    console.error("suggest-questions:", e);
    res.json({ perguntas: [] });
  }
});

// ─── POST /api/notebook/tabela ────────────────────────────────────────────────
router.post("/notebook/tabela", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docIds, cadernoId } = req.body as { docIds?: number[]; cadernoId?: number };
  try {
    const chunks = await ragSearch(req.userId, docIds?.length ? docIds : null, "dados comparação conceitos", 10);
    if (!chunks.length) { res.status(400).json({ erro: "Adicione documentos primeiro." }); return; }
    const context = chunks.map(c => `[${c.title}]\n${c.text}`).join("\n\n").slice(0, 6000);
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.3, max_tokens: 1500,
      messages: [
        { role: "system", content: 'Analise as fontes e crie uma tabela comparativa dos conceitos/dados principais. Retorne JSON: {"titulo":"string","colunas":["col1","col2",...],"linhas":[["val1","val2",...],...],"notas":"string opcional"}. Mínimo 3 colunas e 5 linhas.' },
        { role: "user", content: `Fontes:\n${context}` }
      ],
    });
    const text = completion.choices[0].message.content ?? "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const tabela = match ? JSON.parse(match[0]) : { titulo: "Tabela", colunas: [], linhas: [] };
    res.json(tabela);
  } catch (e) {
    console.error("tabela:", e);
    res.status(500).json({ erro: "Erro ao gerar tabela" });
  }
});

// ─── POST /api/notebook/relatorio ─────────────────────────────────────────────
router.post("/notebook/relatorio", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docIds, cadernoId, template = "academico" } = req.body as { docIds?: number[]; cadernoId?: number; template?: string };
  try {
    const chunks = await ragSearch(req.userId, docIds?.length ? docIds : null, "conteúdo principal análise", 12);
    if (!chunks.length) { res.status(400).json({ erro: "Adicione documentos primeiro." }); return; }
    const context = chunks.map(c => `[${c.title}]\n${c.text}`).join("\n\n").slice(0, 8000);
    const templates: Record<string, string> = {
      academico: "relatório acadêmico formal com abstract, introdução, desenvolvimento, conclusão e referências",
      blog: "post de blog envolvente com título chamativo, introdução, seções com subtítulos e conclusão",
      executivo: "briefing executivo com sumário executivo, pontos-chave, análise e recomendações",
      aula: "plano de aula completo com objetivos, conteúdo, metodologia e avaliação",
    };
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.4, max_tokens: 2000,
      messages: [
        { role: "system", content: `Você é especialista em produção de conteúdo. Escreva um ${templates[template] ?? templates.academico} com base nas fontes. Use Markdown formatado. Cite fontes quando relevante.` },
        { role: "user", content: `Fontes:\n${context}` }
      ],
    });
    res.json({ conteudo: completion.choices[0].message.content ?? "", template });
  } catch (e) {
    console.error("relatorio:", e);
    res.status(500).json({ erro: "Erro ao gerar relatório" });
  }
});

// ─── POST /api/notebook/fast-research ─────────────────────────────────────────
router.post("/notebook/fast-research", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { topic } = req.body as { topic: string };
  if (!topic?.trim()) { res.status(400).json({ erro: "Tópico obrigatório" }); return; }
  try {
    // DuckDuckGo Instant Answer API (free, no key needed)
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1&t=studyai`;
    const ddgRes = await fetch(ddgUrl, { signal: AbortSignal.timeout(8000) });
    const ddgData = await ddgRes.json() as any;

    const results: Array<{ titulo: string; url: string; snippet: string }> = [];
    if (ddgData.AbstractURL && ddgData.AbstractText) {
      results.push({ titulo: ddgData.Heading || topic, url: ddgData.AbstractURL, snippet: ddgData.AbstractText.slice(0, 250) });
    }
    for (const t of (ddgData.RelatedTopics ?? []).slice(0, 9)) {
      if (t.FirstURL && t.Text) {
        results.push({ titulo: t.Text.split(" - ")[0].slice(0, 100), url: t.FirstURL, snippet: t.Text.slice(0, 200) });
      }
    }

    // Fallback: use GPT to suggest real Wikipedia/educational sources
    if (results.length < 3) {
      const completion = await gpt.chat.completions.create({
        model: "gpt-4o-mini", max_tokens: 700,
        messages: [
          { role: "system", content: 'Sugira 6-8 fontes web educacionais reais e relevantes (Wikipedia pt.br, Khan Academy, Brasil Escola, etc). Retorne JSON: [{"titulo":"...","url":"https://...","snippet":"..."}]. Use URLs reais.' },
          { role: "user", content: `Tópico: ${topic}` }
        ],
      });
      const text = completion.choices[0].message.content ?? "[]";
      const m = text.match(/\[[\s\S]*\]/);
      if (m) results.push(...JSON.parse(m[0]));
    }
    res.json({ resultados: results.slice(0, 10) });
  } catch (e) {
    console.error("fast-research:", e);
    res.status(500).json({ erro: "Erro na pesquisa" });
  }
});

// ─── POST /api/notebook/discover ──────────────────────────────────────────────
router.post("/notebook/discover", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docIds, cadernoId } = req.body as { docIds?: number[]; cadernoId?: number };
  try {
    const chunks = await ragSearch(req.userId, docIds?.length ? docIds : null, "tópicos principais conceitos", 5);
    if (!chunks.length) { res.json({ sugestoes: [] }); return; }
    const context = chunks.slice(0, 3).map(c => c.text).join("\n\n").slice(0, 2000);
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini", max_tokens: 700,
      messages: [
        { role: "system", content: 'Com base no material, sugira 6 fontes web complementares reais (Wikipedia, Khan Academy, Brasil Escola, YouTube educativo). Retorne JSON: [{"titulo":"...","url":"https://...","snippet":"...","relevancia":"alta|media"}]. URLs devem ser reais e educacionais.' },
        { role: "user", content: `Material atual:\n${context}` }
      ],
    });
    const text = completion.choices[0].message.content ?? "[]";
    const m = text.match(/\[[\s\S]*\]/);
    const sugestoes = m ? JSON.parse(m[0]) : [];
    res.json({ sugestoes: sugestoes.slice(0, 8) });
  } catch (e) {
    console.error("discover:", e);
    res.json({ sugestoes: [] });
  }
});

// ─── POST /api/notebook/share-link ────────────────────────────────────────────
router.post("/notebook/share-link", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { cadernoId } = req.body as { cadernoId: number };
  if (!cadernoId) { res.status(400).json({ erro: "cadernoId obrigatório" }); return; }
  try {
    const nbId = await resolveNotebookId(req.userId, cadernoId);
    const crypto = await import("crypto");
    const token = crypto.randomBytes(16).toString("hex");
    await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS share_token varchar(64) DEFAULT NULL`);
    await db.execute(sql`UPDATE notebooks SET share_token = ${token} WHERE id = ${nbId}`);
    res.json({ token });
  } catch (e) {
    console.error("share-link:", e);
    res.status(500).json({ erro: "Erro ao gerar link" });
  }
});

// ─── GET /api/notebook/shared/:token ─────────────────────────────────────────
router.get("/notebook/shared/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    await db.execute(sql`ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS share_token varchar(64) DEFAULT NULL`);
    const result = await db.execute(sql`SELECT id, title, emoji, persona FROM notebooks WHERE share_token = ${token}`);
    if (!result.rows.length) { res.status(404).json({ erro: "Caderno não encontrado" }); return; }
    const nb = result.rows[0] as any;
    const docs = await db.execute(sql`SELECT id, title, source_file, file_size_kb FROM knowledge_documents WHERE notebook_id = ${nb.id} LIMIT 20`);
    res.json({ caderno: nb, docs: docs.rows });
  } catch (e) {
    console.error("shared:", e);
    res.status(500).json({ erro: "Erro ao carregar" });
  }
});

export default router;
