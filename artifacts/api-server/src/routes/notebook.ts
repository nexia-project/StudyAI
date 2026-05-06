/**
 * /api/notebook — StudyAI Notebook (RAG sem embeddings: busca textual robusta)
 *
 * Usa Replit AI Integrations proxy (GPT-4o-mini) para toda geração de texto.
 * RAG implementado com busca por palavras-chave + full-text search no Postgres.
 * Sem dependência de OPENAI_API_KEY ou DEEPSEEK_API_KEY.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { createRequire } from "module";
import type OpenAI from "openai";
import { openrouter, OR, generateWithGemini } from "../lib/aiClient";
import multer from "multer";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { validateFileUpload } from "../middlewares/security";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { logAiUsage } from "../lib/aiCostLogger";
import { trackEvent } from "../lib/trackEvent";

const _require = createRequire(import.meta.url);
const router: IRouter = Router();

// ─── AI client via OpenRouter (cheaper models, same interface) ─────────────
const _rawGpt = openrouter;

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

  // ─── Chunks de texto para RAG textual (sem embeddings vetoriais) ─────────────
  // BUG FIX: Esta tabela nunca foi criada explicitamente — causava falha silenciosa
  // em todos os uploads de PDF/doc e tornava toda busca RAG vazia.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notebook_embeddings (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      doc_id INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      source_title VARCHAR(255) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_nb_emb_user_doc') THEN
        CREATE INDEX idx_nb_emb_user_doc ON notebook_embeddings(user_id, doc_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_nb_emb_chunk') THEN
        CREATE INDEX idx_nb_emb_chunk ON notebook_embeddings USING gin(to_tsvector('portuguese', chunk_text));
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
  // Cache de overviews por documento
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notebook_overviews (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      doc_id INTEGER NOT NULL,
      summary TEXT DEFAULT '',
      key_topics JSONB DEFAULT '[]'::jsonb,
      faq JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, doc_id)
    )
  `);

  // Log de ações do Tiagão (emails, WhatsApp, lembretes)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tiagao_actions_log (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      payload JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(20) DEFAULT 'pending',
      executed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
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
    const created = r.rows[0] as any;
    trackEvent({ userId: req.userId!, eventType: "notebook_created", notebookId: created?.id, metadata: { title: String(title).slice(0, 60) } });
    res.json(created);
  } catch (e) {
    req.log?.error({ err: e }, "create caderno");
    res.status(500).json({ erro: "Erro ao criar caderno" });
  }
});

router.patch("/notebook/cadernos/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const id = parseInt(String(req.params.id));
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
  const id = parseInt(String(req.params.id));
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

// ─── RAG: hybrid keyword + FTS search (safe parameterized SQL) ───────────────
async function ragSearch(
  userId: string,
  docIds: number[] | null,
  query: string,
  topK = 8,
): Promise<Array<{ text: string; title: string }>> {
  await ensureNotebooksSchema(); // Garante que notebook_embeddings existe

  // Extract keywords (stop-word filtered)
  const stopWords = new Set(["o","a","os","as","um","uma","de","da","do","e","que","em","para","com","por","se","me","te","nos","isso","isto","esse","esta","este","como","qual","quais","quando","onde","quem","não","sim","mais","mas","ou","é","foi","ser","ter","há","já","nesta","nesse","seu","sua"]);
  const keywords = query
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 6);

  // Convert docIds array to PostgreSQL literal {1,2,3} to avoid drizzle param serialization bug
  const docArray = docIds && docIds.length > 0 ? docIds : null;
  const pgDocArray = docArray ? `{${docArray.join(",")}}` : null;

  // Strategy 1: FTS (Portuguese full-text search) — fastest and most accurate
  let ftsResults: any[] = [];
  if (keywords.length > 0) {
    try {
      const ftsQuery = keywords.join(" | ");
      const ftsRows = pgDocArray
        ? await db.execute(sql`
            SELECT chunk_text, source_title,
              ts_rank(to_tsvector('portuguese', chunk_text), to_tsquery('portuguese', ${ftsQuery})) AS score
            FROM notebook_embeddings
            WHERE user_id = ${userId}
              AND doc_id = ANY(${pgDocArray}::int[])
              AND to_tsvector('portuguese', chunk_text) @@ to_tsquery('portuguese', ${ftsQuery})
            ORDER BY score DESC LIMIT ${topK * 2}
          `)
        : await db.execute(sql`
            SELECT chunk_text, source_title,
              ts_rank(to_tsvector('portuguese', chunk_text), to_tsquery('portuguese', ${ftsQuery})) AS score
            FROM notebook_embeddings
            WHERE user_id = ${userId}
              AND to_tsvector('portuguese', chunk_text) @@ to_tsquery('portuguese', ${ftsQuery})
            ORDER BY score DESC LIMIT ${topK * 2}
          `);
      ftsResults = ftsRows.rows as any[];
    } catch {
      // FTS can fail on complex queries — fall through to ILIKE
    }
  }

  // Strategy 2: ILIKE fallback (keyword by keyword) — works when FTS fails
  let ilikeResults: any[] = [];
  if (ftsResults.length < topK && keywords.length > 0) {
    for (const kw of keywords.slice(0, 3)) {
      const pattern = `%${kw}%`;
      try {
        const iRows = pgDocArray
          ? await db.execute(sql`
              SELECT chunk_text, source_title, 1 AS score
              FROM notebook_embeddings
              WHERE user_id = ${userId}
                AND doc_id = ANY(${pgDocArray}::int[])
                AND chunk_text ILIKE ${pattern}
              ORDER BY chunk_index ASC LIMIT ${topK}
            `)
          : await db.execute(sql`
              SELECT chunk_text, source_title, 1 AS score
              FROM notebook_embeddings
              WHERE user_id = ${userId}
                AND chunk_text ILIKE ${pattern}
              ORDER BY chunk_index ASC LIMIT ${topK}
            `);
        ilikeResults.push(...(iRows.rows as any[]));
      } catch { /* ignore */ }
    }
  }

  // Strategy 3: first chunks fallback when no keywords
  let firstChunks: any[] = [];
  if (ftsResults.length === 0 && ilikeResults.length === 0) {
    const fallbackRows = pgDocArray
      ? await db.execute(sql`
          SELECT chunk_text, source_title, 0 AS score
          FROM notebook_embeddings
          WHERE user_id = ${userId} AND doc_id = ANY(${pgDocArray}::int[])
          ORDER BY chunk_index ASC LIMIT ${topK}
        `)
      : await db.execute(sql`
          SELECT chunk_text, source_title, 0 AS score
          FROM notebook_embeddings
          WHERE user_id = ${userId}
          ORDER BY chunk_index ASC LIMIT ${topK}
        `);
    firstChunks = fallbackRows.rows as any[];
  }

  // Merge, deduplicate, rank
  const allResults = [...ftsResults, ...ilikeResults, ...firstChunks];
  const seen = new Set<string>();
  return allResults
    .filter(r => {
      const key = String(r.chunk_text).slice(0, 120);
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
  const docId = parseInt(String(req.params.id));
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
    const audioFile = new File([new Uint8Array(file.buffer)], file.originalname || "audio.m4a", { type: file.mimetype || "audio/m4a" });
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
      model: OR.fast,
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

// ─── Chat mode system prompts ─────────────────────────────────────────────────
const CHAT_MODE_PROMPTS: Record<string, string> = {
  padrao: `Você é o Professor Tiagão, assistente de estudos especialista em preparação para ENEM e vestibulares brasileiros.
Responda em português brasileiro, de forma clara, didática e objetiva.
Use EXCLUSIVAMENTE as fontes abaixo para responder. Não invente informações.
Cite as fontes usando [Fonte N] quando usar uma informação específica.
Se a pergunta não puder ser respondida com base nas fontes, diga isso claramente.
Ao final, se relevante, acrescente uma dica específica sobre como esse tema cai no ENEM.`,

  estudo: `Você é o Professor Tiagão, tutor paciente e especialista em ENEM e vestibulares.
Modo ESTUDO ativado: use analogias do cotidiano, exemplos práticos e verifique o entendimento do aluno.
Ao responder, sempre: (1) explique o conceito central com uma analogia acessível, (2) aprofunde com exemplos das fontes, (3) pergunte "Faz sentido?" ou proponha um exercício mental.
Use EXCLUSIVAMENTE as fontes abaixo. Cite com [Fonte N].`,

  pesquisa: `Você é o Professor Tiagão em modo PESQUISA — análise acadêmica rigorosa.
Tom: objetivo, técnico, baseado em evidências.
Ao responder: cite metodologias e dados específicos das fontes, indique limitações e lacunas, diferencie fatos de interpretações.
Limite-se estritamente às fontes disponíveis. Cite com [Fonte N].
Ao final, aponte possíveis lacunas de conhecimento não cobertas pelas fontes.`,

  revisao: `Você é o Professor Tiagão em modo REVISÃO — foco em fixação e prova.
Ao responder: destaque os pontos-chave em formato de lista, sugira mnemônicos quando aplicável, conecte o tema ao padrão ENEM (competências e habilidades).
Use linguagem direta e memorável. Inclua "O que CAI no ENEM:" ao final.
Use EXCLUSIVAMENTE as fontes abaixo. Cite com [Fonte N].`,

  duvidas: `Você é o Professor Tiagão em modo DÚVIDAS — acolhimento total, zero julgamento.
Toda dúvida é válida e importante. Antes de responder, confirme: "Entendi, você quer saber..."
Explique de forma extremamente simples, como se o aluno nunca tivesse visto o assunto antes.
Use analogias do dia a dia. Evite jargões sem explicá-los primeiro.
Use EXCLUSIVAMENTE as fontes abaixo. Cite com [Fonte N].`,
};

router.post("/notebook/chat", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { pergunta, docIds, cadernoId, modo = "padrao" } = req.body as { pergunta: string; docIds?: number[]; cadernoId?: number; modo?: string };
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

    const modePrompt = CHAT_MODE_PROMPTS[modo] ?? CHAT_MODE_PROMPTS.padrao;

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: modo === "pesquisa" ? 0.1 : modo === "estudo" ? 0.4 : 0.2,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content: `${modePrompt}${personaBlock}

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

    trackEvent({ userId: req.userId!, eventType: "notebook_chat", notebookId: cadernoId, metadata: { chunksUsed: chunks.length, fontesCitadas: fontesCitadas.size } });
    res.json({ resposta, fontes });
  } catch (e) {
    console.error("notebook chat:", e);
    res.status(500).json({ erro: "Erro ao processar pergunta. Verifique sua conexão e tente novamente." });
  }
});

// ─── POST /api/notebook/chat-stream (SSE streaming) ──────────────────────────
router.post("/notebook/chat-stream", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { pergunta, docIds, cadernoId, modo = "padrao" } = req.body as { pergunta: string; docIds?: number[]; cadernoId?: number; modo?: string };
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
      const hasDocIds = docIds && docIds.length > 0;
      const errMsg = hasDocIds
        ? "Não consegui extrair texto dos documentos selecionados. Isso acontece com PDFs escaneados (só imagem) ou arquivos de design. Tente adicionar o conteúdo como Texto ou URL."
        : "Adicione pelo menos uma fonte primeiro (PDF com texto, URL ou texto direto) para eu poder responder com base no seu material.";
      send("chunk", { text: errMsg });
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

    const modePrompt = CHAT_MODE_PROMPTS[modo] ?? CHAT_MODE_PROMPTS.padrao;

    // ── DeepSeek Pro via OpenRouter — fontes injetadas no contexto ───────────
    let full = "";
    {
      const stream = await gpt.chat.completions.create({
        model: OR.pro,
        temperature: modo === "pesquisa" ? 0.1 : modo === "estudo" ? 0.4 : 0.2,
        max_tokens: 2800,
        stream: true,
        messages: [
          {
            role: "system",
            content: `${modePrompt}${personaBlock}\n\nFONTES DISPONÍVEIS:\n${context}`,
          },
          { role: "user", content: pergunta },
        ],
      });
      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content || "";
        if (delta) { full += delta; send("chunk", { text: delta }); }
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
      model: OR.fast,
      temperature: 0.4,
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: `Você é um jornalista de newsletter educacional. Analise o documento e retorne APENAS um JSON válido, sem markdown:
{
  "insightCentral": "1 frase impactante que captura a essência do documento — direto ao ponto, sem 'Este texto fala sobre...'",
  "contexto": "2-3 frases de por que este tema importa para o aluno de ENEM/vestibular",
  "pilares": [
    { "conceito": "nome do conceito", "explicacao": "explicação + conexão com o insight central", "conexaoEnem": "como isso cai no ENEM" }
  ],
  "aplicacaoPratica": "Onde/como esse conhecimento é usado na vida real",
  "questaoProvocadora": "Pergunta reflexiva aberta que estimula pensamento crítico",
  "proximosPassos": "O que estudar em seguida para aprofundar",
  "keyTopics": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5", "tópico 6"],
  "faq": [
    { "q": "Pergunta frequente sobre o conteúdo?", "a": "Resposta clara e direta baseada nas fontes" }
  ]
}
Gere 4-5 pilares, 5-6 tópicos-chave e 5 perguntas FAQ.
NUNCA comece com "Este documento/texto fala sobre...". Vá direto ao insight.`,
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

    const studyGuideSystemPrompt = `Você é um tutor mestre especializado em ENEM/vestibulares, com domínio em pedagogia ativa e neurociência da aprendizagem. Crie um guia de estudo COMPLETO, RICO e PROFISSIONAL no formato Mapa de Jornada.
Retorne APENAS JSON válido, sem markdown:
{
  "titulo": "Guia de Estudo: [assunto específico]",
  "objetivoFinal": "Ao final deste guia, você será capaz de... [descrever 2-3 competências concretas e mensuráveis]",
  "checklistCompetencias": ["competência 1 detalhada", "competência 2 detalhada", "competência 3", "competência 4", "competência 5"],
  "prerequisitos": "Parágrafo explicando o que o aluno precisa saber antes — cite conceitos específicos",
  "quizDiagnostico": [
    { "pergunta": "Pergunta diagnóstica desafiadora e específica do tema?", "dica": "Pensa em [conceito concreto]..." }
  ],
  "modulos": [
    {
      "numero": 1,
      "titulo": "Título Descritivo e Instigante do Módulo",
      "tempoBruto": "20-30 min",
      "objetivo": "Competência específica e mensurável deste módulo",
      "conceitoCentral": "Parágrafo de 3-5 frases explicando o conceito central com analogia do cotidiano, contexto histórico/científico e por que ele é fundamental para entender o tema.",
      "aprofundamento": "Parágrafo de 4-6 frases com detalhes técnicos, dados quantitativos, nuances e contradições. Inclua fatos específicos do documento com datas, nomes, números quando disponíveis.",
      "exemploResolvido": "Resolução passo-a-passo detalhada: Passo 1: [ação concreta]. Passo 2: [raciocínio]. Passo 3: [cálculo/aplicação]. Passo 4: [resultado e interpretação]. Relacione com questão real do ENEM.",
      "curiosidade": "Um fato surpreendente e memorável sobre este conceito que o aluno vai contar para os amigos",
      "errosComuns": ["Erro específico e frequente 1 — explique por que ocorre", "Erro 2", "Erro 3", "Erro 4"],
      "checkpoint": ["Pergunta de autoavaliação aprofundada 1?", "Pergunta 2 que exige síntese?", "Pergunta 3 de aplicação?"]
    }
  ],
  "sintese": "Parágrafo de 4-6 frases conectando todos os módulos, mostrando como os conceitos se relacionam e formam um todo coerente",
  "aplicacaoPratica": "Descrição de um caso real e atual + exercício desafiador de transferência de conhecimento com orientação de resolução",
  "expansao": {
    "leituras": ["Sugestão 1 com descrição do que vai aprender", "Sugestão 2", "Sugestão 3"],
    "conexoes": ["Tema relacionado 1 — por que se conecta", "Tema relacionado 2", "Tema relacionado 3"]
  },
  "cronogramaSugerido": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ...", "Dia 4: ...", "Dia 5: revisão e prática"]
}
REGRAS OBRIGATÓRIAS:
- Gere 5-6 módulos cobrindo PROGRESSIVAMENTE todo o documento — do básico ao avançado
- Quiz diagnóstico com 4 perguntas desafiadoras
- Cada conceitoCentral: MÍNIMO 3 frases completas com analogia e contexto
- Cada aprofundamento: MÍNIMO 4 frases com dados específicos do documento
- Cada exemploResolvido: MÍNIMO 4 passos detalhados
- Use dados, datas, nomes e números reais do documento
- Linguagem envolvente: como um professor apaixonado explicaria para um aluno`;

    const studyGuideUserPrompt = `Tema: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 60_000)}`;

    // Gemini 2.5 Flash — NotebookLM-style com contexto completo do documento
    const raw = await generateWithGemini(studyGuideSystemPrompt, studyGuideUserPrompt, 8000);
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
  const { docId, quantidade = 20 } = req.body as { docId: number; quantidade?: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.3,
      max_tokens: 5500,
      messages: [
        {
          role: "system",
          content: `Você é um designer de memória especializado em ENEM/vestibulares, especialista em spaced repetition e técnicas de memorização ativa. Crie ${quantidade} flashcards de ALTA QUALIDADE para recuperação ativa.
Cada card deve ser ATÔMICO (uma única ideia), específico (não genérico) e baseado nos dados reais do documento.
Retorne APENAS JSON:
{"flashcards": [
  {
    "frente": "Pergunta de recuperação ativa instigante — específica e não-óbvia. Use formas como: Por que X causa Y? Como Z se diferencia de W? O que acontece quando...? Qual é a relação entre...?",
    "verso": "Resposta completa em 3-5 frases: (1) resposta direta e clara, (2) contexto explicativo com dados/datas/nomes do documento, (3) exemplo prático concreto do cotidiano ou do ENEM, (4) conexão com outros conceitos.",
    "mnemonico": "Macete, acrônimo, analogia ou história memorável que facilita lembrar. Seja criativo e específico — ex: 'COMES = Camadas da Terra de fora para dentro: Crosta, Oceano, Manto, Externa, Sólido'",
    "materia": "área do conhecimento ENEM (Ciências da Natureza / Ciências Humanas / Linguagens / Matemática)",
    "dificuldade": "facil|medio|dificil",
    "tipo": "fato|conceito|comparacao|aplicacao",
    "dicaEnem": "Como este conceito costuma aparecer no ENEM — que tipo de questão, qual a pegadinha mais comum"
  }
]}
DISTRIBUIÇÃO OBRIGATÓRIA: 25% fácil, 50% médio, 25% difícil.
TIPOS: fato (dado direto), conceito (definição+importância), comparação (X vs Y em dimensão Z), aplicação (cenário real ou questão ENEM).
REGRAS:
- Verso: MÍNIMO 3 frases com dados específicos do documento (nomes, datas, números)
- Mnemônico: SEMPRE preenchido — nunca null — seja criativo
- Cubra TODOS os conceitos importantes do documento
- Priorize o que mais cai no ENEM`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\n${row.content_text.slice(0, 15_000)}` },
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
      model: OR.fast,
      temperature: 0.2,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `Você é um examinador experiente do ENEM, especialista em Taxonomia de Bloom aplicada à avaliação. Crie ${quantidade} questões no estilo exato do ENEM.
Distribua os níveis de Bloom: 20% lembrar, 30% compreender, 30% aplicar, 20% analisar.
Retorne APENAS JSON:
{"questoes": [
  {
    "enunciado": "Texto de contextualização (2-4 frases) + enunciado direto no estilo ENEM",
    "alternativas": {"A": "texto completo", "B": "texto completo", "C": "texto completo", "D": "texto completo", "E": "texto completo"},
    "gabarito": "A",
    "bloomLevel": "lembrar|compreender|aplicar|analisar|avaliar|criar",
    "habilidade": "Habilidade ENEM avaliada (ex: H19, ou descrição)",
    "explicacao": "Por que a alternativa correta está certa — e por que cada distrator está errado",
    "dicaResolutora": "Estratégia para resolver essa categoria de questão no ENEM"
  }
]}
REGRAS: alternativas plausíveis (sem opções obviamente erradas), distractores baseados em erros conceituais reais, contexto sempre antes do enunciado.`,
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

    const mapaSystemPrompt = `Você é um especialista em síntese visual e pedagogia para ENEM/vestibulares. Crie um mapa mental RICO e COMPLETO.
Retorne APENAS JSON válido e COMPLETO (nunca truncado):
{
  "subject": "Tema central (max 5 palavras)",
  "icone": "emoji representativo do tema",
  "categories": [
    {
      "name": "Ramo Principal (max 4 palavras)",
      "icone": "emoji do ramo",
      "cor": "#código-hex vibrante",
      "topics": [
        {
          "name": "Sub-tópico (max 5 palavras)",
          "subtopics": [
            {
              "name": "Conceito (max 6 palavras)",
              "detail": "1-2 frases diretas: o que é e como cai no ENEM."
            }
          ]
        }
      ]
    }
  ],
  "conexoesCruzadas": [
    { "de": "Ramo A", "para": "Ramo B", "relacao": "conexão em 1 frase curta" }
  ],
  "conceitosChave": ["conceito: definição curta", "conceito 2", "conceito 3", "conceito 4", "conceito 5"]
}
REGRAS:
- 4 a 5 ramos principais (categories), cada um com cor HEX única
- 3 a 4 tópicos por ramo
- 2 a 3 subtópicos por tópico com detail CURTO (1-2 frases)
- Nomes curtos (sem pontuação final)
- 3 conexões cruzadas entre ramos
- 5 conceitos-chave com definições curtas
- O JSON DEVE estar 100% fechado e válido`;

    // Gemini 2.5 Flash — NotebookLM-style com contexto completo
    const raw = await generateWithGemini(
      mapaSystemPrompt,
      `Documento: "${row.title}"\n\n${row.content_text.slice(0, 60_000)}`,
      8000,
    );
    let clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Tenta reparar JSON truncado: fecha strings e objetos abertos
      let rep = clean;
      if ((rep.match(/"/g) ?? []).length % 2 !== 0) rep += '"';
      const stack: string[] = [];
      let inStr = false;
      for (let i = 0; i < rep.length; i++) {
        const c = rep[i]; const prev = rep[i - 1];
        if (c === '"' && prev !== '\\') inStr = !inStr;
        if (!inStr) { if (c === '{') stack.push('}'); else if (c === '[') stack.push(']'); else if (c === '}' || c === ']') stack.pop(); }
      }
      while (stack.length) rep += stack.pop();
      try { parsed = JSON.parse(rep); }
      catch { parsed = { subject: "Mapa Mental", categories: [], conceitosChave: [], conexoesCruzadas: [] }; }
    }

    // Flatten categories into topics array for frontend compatibility
    if (parsed.categories) {
      parsed.topics = parsed.categories.flatMap((cat: any) =>
        cat.topics.map((t: any) => ({
          ...t,
          color: cat.cor ?? "#6366f1",
          category: cat.name,
          categoryIcon: cat.icone ?? "",
        }))
      );
    } else if (parsed.topics && !parsed.categories) {
      // backward compat: old format
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
      model: OR.fast,
      temperature: 0.7,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Você é um roteirista de podcast educativo de alta qualidade. Crie um episódio estilo Flow Podcast / Nerdcast sobre o conteúdo.

PERSONAGENS:
- ANA (Host A — Especialista/Guia): tom curioso e acessível, introduz e explica. Frases-tipo: "Isso me lembra...", "O que é fascinante aqui é que..."
- PEDRO (Host B — Aprendiz Questionador): inteligente mas não-especialista, representa as dúvidas do ouvinte. Frases-tipo: "Então quer dizer que...", "Espera, mas eu achava que..."

ESTRUTURA DO ROTEIRO (5 etapas):
1. INTRO (gancho surpresa + por que isso importa hoje)
2. SEÇÃO 1 — Contexto + analogia central do cotidiano
3. SEÇÃO 2 — Insights principais + tensão/debate interno
4. SEÇÃO 3 — Aplicação prática e conexão com ENEM
5. ENCERRAMENTO — Síntese + reflexão + dica de estudo

Retorne APENAS JSON válido:
{
  "titulo": "Título criativo do episódio (estilo podcast real, não genérico)",
  "subtitulo": "Matéria | Nível ENEM",
  "duracao": "~10-12 min estimado",
  "gancho": "A frase de abertura mais impactante do roteiro",
  "roteiro": [
    { "speaker": "ANA", "fala": "texto natural, como fala oral — não texto formal" },
    { "speaker": "PEDRO", "fala": "texto natural com surpresa/dúvida genuína" }
  ],
  "destaques": ["Insight 1 que vai surpreender o ouvinte", "Insight 2", "Insight 3"],
  "dicaEnem": "Como esse tema aparece no ENEM"
}

REGRAS:
- 16-24 falas totais alternando naturalmente
- NUNCA "Como dizia o texto..." — fale DIRETAMENTE do conteúdo
- Inclua 1 fato surpreendente que vai fazer o ouvinte dizer "Nossa!"
- Analogias do dia a dia (não academic)
- Riso natural, pausas, interrupções (ex: "Espera—")`,
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

// ─── POST /api/notebook/briefing ─────────────────────────────────────────────
router.post("/notebook/briefing", async (req: Request, res: Response) => {
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
      model: OR.fast,
      temperature: 0.3,
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: `Você é um analista estratégico criando um briefing executivo compacto para estudante de ENEM/vestibular.
Retorne APENAS JSON válido:
{
  "titulo": "Briefing: [Tema]",
  "problema": "Problema ou contexto central em 2-3 frases impactantes",
  "pontosChave": [
    { "ponto": "Bullet impactante e memorizável", "evidencia": "Base no documento" }
  ],
  "conclusoes": "Resumo executivo de 2-3 frases — o que o aluno precisa saber",
  "recomendacoes": [
    { "acao": "Ação concreta de estudo", "justificativa": "Por que isso é prioritário" }
  ],
  "proximosPassos": "Timeline de estudo sugerida (ex: Dia 1: conceitos X e Y, Dia 2: prática com questões)",
  "palavrasChave": ["termo 1", "termo 2", "termo 3", "termo 4", "termo 5"],
  "conexoesEnem": "Como esses tópicos aparecem no ENEM — competências e habilidades"
}
Gere 4-6 pontos-chave e 3-4 recomendações. Tom direto e executivo — sem rodeios.`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook briefing:", e);
    res.status(500).json({ erro: "Erro ao gerar briefing" });
  }
});

// ─── POST /api/notebook/plano-aula ───────────────────────────────────────────
// ─── PERSONAS de Geração Educacional ──────────────────────────────────────────
// /personas/mestre_yoda.py  /personas/tia_marlene.py  /personas/coach_energia.py
// /personas/cientista_maluco.py  /personas/narrador_epico.py
const PERSONAS_EDU: Record<string, { nome: string; desc: string; instrucoes: string; tom: string }> = {
  planejador: {
    nome: "Planejador Experiente",
    desc: "Professor com 15+ anos, pós-graduado, prático e realista",
    instrucoes: "Você é um professor veterano com 15+ anos de sala. Seus planos são realistas, não utópicos. Você NUNCA promete milagres e SEMPRE tem plano B. JAMAIS usa verbos não observáveis (entender, saber) — sempre verbos de ação (identificar, calcular, analisar).",
    tom: "Direto, sem floreios, mas com carinho implícito. 'Na minha turma, isso não funciona assim...'"
  },
  mestre_yoda: {
    nome: "Mestre Yoda",
    desc: "Ensina via perguntas socráticas — nunca entrega a resposta",
    instrucoes: "Você é Mestre Yoda da educação. NUNCA entrega a resposta diretamente — sempre faz a pergunta que leva o aluno à descoberta. Estrutura TUDO como jornada de autoconhecimento. Usa metáforas sábias e situações do cotidiano do aluno para revelar o conteúdo. Cada momento da aula é uma missão. O aluno descobre, você apenas ilumina o caminho. Inclua 'questões meditativas' em vez de questões simples.",
    tom: "Sábio, calmo, misterioso. Frases curtas com profundidade. 'Aprender, você só pode, se descobrir, você quiser.'"
  },
  tia_marlene: {
    nome: "Tia Marlene",
    desc: "Professora acolhedora — usa analogias do cotidiano (cozinha, família, supermercado)",
    instrucoes: "Você é Tia Marlene, professora acolhedora que explica TUDO com analogias do dia a dia — cozinha, feira, família, supermercado, vizinhança. Cada conceito abstrato DEVE ter uma analogia concreta e afetiva. Use linguagem calorosa e inclusiva. Celebre pequenos progressos. Adapte naturalmente para diferentes necessidades sem segregar. Suas atividades usam materiais simples e acessíveis.",
    tom: "Caloroso, acolhedor, maternal. 'Não se preocupa não, filhão...' 'Isso é igualzinho quando a gente...'"
  },
  coach_energia: {
    nome: "Coach Energia",
    desc: "Alta energia — usa esportes, competição saudável, celebra cada vitória",
    instrucoes: "Você é um Coach de alta performance que transpôs sua metodologia para a educação. USA MUITA energia e entusiasmo. Cada aula é um treino, cada objetivo é um gol, cada aluno é um atleta em formação. Gamifique tudo: pontos, rounds, desafios cronometrados, celebrações coletivas. Estruture a aula como treino esportivo: aquecimento → treino principal → volta à calma → análise de performance.",
    tom: "Energético, motivador, contagiante. 'Vamos! Você consegue! Foco, força e fé!'"
  },
  cientista_maluco: {
    nome: "Cientista Maluco",
    desc: "Apaixonado por descobertas — experimentos, surpresas, 'E se...?'",
    instrucoes: "Você é um Cientista apaixonado que vê TUDO como experimento. Cada aula começa com 'E SE...?' ou 'O que acontece se...?'. Estruture como descoberta científica: hipótese → experimento → observação → conclusão. Inclua momentos de 'UAU' (revelações surpreendentes). Conecte o conteúdo com curiosidades inusitadas. Alunos são seus co-pesquisadores, não receptores passivos. Celebre os erros como dados valiosos.",
    tom: "Entusiasmado, curioso, excêntrico. 'INCRÍVEL! Vocês sabem o que isso significa?!' Usa muito '!'"
  },
  narrador_epico: {
    nome: "Narrador Épico",
    desc: "Tudo é dramático e épico — linguagem de documentário da BBC",
    instrucoes: "Você é um Narrador Épico estilo BBC/National Geographic. TUDO na sua aula tem dimensão épica e dramática. O conteúdo mais simples se torna uma jornada épica da humanidade. Use linguagem de documentário: 'Há milhares de anos...', 'NUNCA antes na história da civilização...', 'O que você está prestes a descobrir mudará sua visão do mundo.' Cada momento da aula é uma cena cinematográfica. Construa tensão dramática crescente até a revelação épica.",
    tom: "Dramático, solene, cinematográfico. 'NUNCA ANTES NA HISTÓRIA...' Pausa dramática antes das revelações."
  },
};

// /core/orquestrador.py — Orquestrador de Personas
function getPersonaSystem(personaKey: string): string {
  const p = PERSONAS_EDU[personaKey] ?? PERSONAS_EDU["planejador"];
  return `${p.instrucoes}\n\nTOM: ${p.tom}`;
}

// /core/validador_pares.py — Validação por Pares (3 IAs)
async function validarPares(planoJson: string, tema: string): Promise<Record<string, string>> {
  const validadores = [
    { key: "veterano", perfil: "Professor Veterano com 20+ anos de sala de aula, realista e pragmático" },
    { key: "inclusao", perfil: "Especialista em Educação Inclusiva e acessibilidade pedagógica" },
    { key: "pesquisador", perfil: "Pesquisador-acadêmico de doutorado em educação, fundamenta tudo em teoria" },
  ];
  const feedbacks: Record<string, string> = {};
  for (const v of validadores) {
    try {
      const r = await gpt.chat.completions.create({
        model: OR.fast, temperature: 0.5, max_tokens: 400,
        messages: [
          { role: "system", content: `Você é ${v.perfil}. Analise este plano de aula e dê um feedback HONESTO e ESPECÍFICO em 2-4 frases: o que funciona, o que não funciona, 1 sugestão de melhoria. Seja direto.` },
          { role: "user", content: `Tema: ${tema}\n\nPlano:\n${planoJson.slice(0, 3000)}` },
        ],
      });
      feedbacks[v.key] = r.choices[0].message.content ?? "";
    } catch { feedbacks[v.key] = "Validação indisponível"; }
  }
  // Consenso
  const aprovados = Object.values(feedbacks).filter(f => !f.toLowerCase().includes("não funciona") && !f.toLowerCase().includes("problema grave")).length;
  feedbacks["consenso"] = aprovados === 3 ? "✅ Aprovação total pelos 3 validadores"
    : aprovados >= 2 ? "⚠️ Aprovação com ressalvas — ajuste antes de aplicar"
    : "❌ Recomenda revisão — veja os feedbacks individuais";
  return feedbacks;
}

router.post("/notebook/plano-aula", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, duracao = 50, nivel = "Ensino Médio", perfilTurma = "heterogenea", persona = "planejador" } = req.body as { docId: number; duracao?: number; nivel?: string; perfilTurma?: string; persona?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const aberturaMin = Math.round(duracao * 0.15);
    const dev1Min = Math.round(duracao * 0.30);
    const dev2Min = Math.round(duracao * 0.30);
    const fechamentoMin = duracao - aberturaMin - dev1Min - dev2Min;

    const personaSystem = getPersonaSystem(persona);
    const personaInfo = PERSONAS_EDU[persona] ?? PERSONAS_EDU["planejador"];

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.6,
      max_tokens: 6500,
      messages: [
        {
          role: "system",
          content: `${personaSystem}

REGRAS OBRIGATÓRIAS:
- NUNCA escreva objetivos com verbos não observáveis ("entender", "saber") — use verbos de ação.
- A soma das etapas deve ser exatamente ${duracao} minutos.
- SEMPRE inclua diferenciação real por perfil de aluno.

Retorne APENAS JSON válido com esta estrutura (plano_aula_v2.py — schema atualizado):
{
  "titulo": "Título específico e atraente",
  "persona": "${personaInfo.nome}",
  "turma": "${nivel}",
  "duracao": "${duracao} minutos",
  "perfilTurma": "Descrição concreta do perfil da turma",

  "snapshotExecutivo": {
    "essencia": "1 frase que captura a alma desta aula",
    "porqueAgora": "Por que este conteúdo importa para o aluno HOJE",
    "comoSaberQueAprendeu": "1 critério observável de sucesso",
    "riscoMaior": "O que pode dar errado e como prevenir",
    "podaInteligente": "O que NÃO fazer nesta aula (corte pedagógico)"
  },

  "climaDeAula": {
    "energiaEsperada": "Alta / Média / Baixa — justificativa",
    "atencaoPrevista": "Contínua / Intervalada / Focada em momentos-chave",
    "temperatura": "Acolhedora / Desafiadora / Exploratória / Competitiva",
    "recomendacaoAmbiental": "Como preparar o espaço físico/virtual"
  },

  "momentoCero": {
    "chegada": "O que o professor faz nos 3 min antes de começar (música, frase na lousa, etc.)",
    "acolhimento": "Como criar segurança psicológica antes do conteúdo",
    "verificacaoHumor": "Como checar rapidamente o estado emocional da turma"
  },

  "prerequisitos": [
    {"conceito": "Conceito necessário", "status": "verificar antes"}
  ],
  "dificuldadesPrevisíveis": [
    {"dificuldade": "Erro comum", "prevencao": "Como prevenir"}
  ],
  "bncc": {
    "competencia": "Código e descrição",
    "habilidade": "Código e descrição",
    "objetosConhecimento": ["Objeto 1"]
  },
  "objetivos": {
    "geral": "1 objetivo amplo realizável nesta aula",
    "especificos": [
      "Ao final, o estudante será capaz de [verbo de ação] — [critério]",
      "Ao final, o estudante será capaz de [verbo de ação] — [critério]",
      "Ao final, o estudante será capaz de [verbo de ação] — [critério]"
    ],
    "indicadores": ["Critério observável 1", "Critério observável 2"]
  },
  "desenvolvimento": [
    {
      "tempo": "${aberturaMin} min",
      "etapa": "Abertura",
      "nome": "Nome atraente para este momento",
      "atividade": "Descrição detalhada do gancho motivador",
      "recursos": "Lista específica de materiais",
      "estrategia": "Como o professor conduz este momento",
      "dialogoEsperado": {"professor": "Fala ou pergunta de abertura exata do professor", "aluno": "Resposta esperada e como aproveitar respostas inesperadas"},
      "perguntasNorteadoras": ["Pergunta que provoca pensamento", "Pergunta que conecta com vida do aluno"],
      "diferenciacão": {"comDificuldade": "Adaptação específica", "avancados": "Enriquecimento específico"}
    },
    {
      "tempo": "${dev1Min} min",
      "etapa": "Desenvolvimento 1",
      "nome": "Nome do momento",
      "atividade": "Conteúdo principal — descreva passo a passo",
      "recursos": "Materiais necessários",
      "estrategia": "Como conduzir e intervir nos erros",
      "dialogoEsperado": {"professor": "Fala ou pergunta central deste momento", "aluno": "O que observar para saber se está entendendo"},
      "perguntasNorteadoras": ["Pergunta de verificação", "Pergunta de aprofundamento"],
      "diferenciacão": {"comDificuldade": "Adaptação", "avancados": "Extensão"}
    },
    {
      "tempo": "${dev2Min} min",
      "etapa": "Desenvolvimento 2",
      "nome": "Nome do momento",
      "atividade": "Atividade prática ou colaborativa",
      "recursos": "Materiais da atividade",
      "estrategia": "Como formar grupos, circular, intervir",
      "dialogoEsperado": {"professor": "Como mediar a atividade", "aluno": "Sinais de engajamento vs dificuldade"},
      "perguntasNorteadoras": ["Pergunta de metacognição", "Pergunta de aplicação"],
      "diferenciacão": {"comDificuldade": "Suporte adicional", "avancados": "Desafio extra"}
    },
    {
      "tempo": "${fechamentoMin} min",
      "etapa": "Fechamento",
      "nome": "Nome do momento",
      "atividade": "Síntese integradora + avaliação formativa",
      "recursos": "Instrumento de saída",
      "estrategia": "Como verificar se os objetivos foram alcançados",
      "dialogoEsperado": {"professor": "Pergunta de síntese final", "aluno": "O que a resposta revela sobre o aprendizado"},
      "perguntasNorteadoras": ["O que você aprendeu hoje?", "O que ainda ficou com dúvida?"],
      "diferenciacão": {"comDificuldade": "Apoio na síntese", "avancados": "Síntese ampliada"}
    }
  ],

  "versoesEmergencia": {
    "seTurmaEstiverCansada": "Adaptação rápida do plano — o que cortar e o que manter",
    "seTecnologiaFalhar": "Versão analógica completa",
    "seTempoAcabar": "O mínimo irredutível que precisa acontecer",
    "seAlunoDesafiar": "Como aproveitar a resistência como aprendizagem"
  },

  "avaliacao": {
    "instrumento": "Descrição do instrumento avaliativo",
    "rubrica": [
      {"criterio": "Critério 1", "insuficiente": "Nível D", "regular": "Nível C", "bom": "Nível B", "excelente": "Nível A"},
      {"criterio": "Critério 2", "insuficiente": "Nível D", "regular": "Nível C", "bom": "Nível B", "excelente": "Nível A"}
    ]
  },
  "tarefaCasa": "Atividade específica + conexão com próxima aula",
  "adaptacoes": {"turmaRapida": "Enriquecimento", "turmaDificuldade": "Suporte"},
  "materialComplementar": ["Referência 1", "Referência 2"],
  "referencias": {
    "teoricas": ["Referência teórica 1", "Referência 2"],
    "didaticas": ["Recurso 1", "Recurso 2"],
    "fontesCaderno": "Partes do caderno usadas"
  },
  "reflexao": {"oQueFuncionou": "", "oQuePrecisaAjustar": "", "adaptacoesProximaTurma": ""}
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nNível: ${nivel}\nPerfil da turma: ${perfilTurma}\nDuração: ${duracao} minutos\nPersona escolhida: ${personaInfo.nome}\n\nConteúdo do caderno:\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const planoJson = clean;
    const validacao = await validarPares(planoJson, row.title);
    const plano = JSON.parse(planoJson);
    plano._validacaoPares = validacao;
    res.json(plano);
  } catch (e) {
    console.error("notebook plano-aula:", e);
    res.status(500).json({ erro: "Erro ao gerar plano de aula" });
  }
});

// ─── POST /api/notebook/tarefa ────────────────────────────────────────────────
// Tipo B: Tarefa / Atividade para Casa com estrutura dual (aluno + professor)
router.post("/notebook/tarefa", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, tipoTarefa = "estudo-dirigido", nivel = "Ensino Médio" } = req.body as { docId: number; tipoTarefa?: string; nivel?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.6,
      max_tokens: 4500,
      messages: [
        {
          role: "system",
          content: `Você é um Designer de Aprendizagem especialista criando tarefas/atividades para casa de qualidade profissional.
Tipo de tarefa solicitada: ${tipoTarefa} | Nível: ${nivel}
A tarefa deve ter estrutura DUAL: seção para o aluno (linguagem acessível e motivadora) + seção para o professor (técnica e com rúbrica).
NUNCA crie tarefas genéricas ("faça uma pesquisa sobre"). Seja específico com fontes, critérios e passo a passo.

Retorne APENAS JSON válido:
{
  "titulo": "Título específico e motivador para a tarefa",
  "tipo": "${tipoTarefa}",
  "nivel": "${nivel}",
  "tempoEstimado": "Estimativa realista em minutos",
  "paraAluno": {
    "oQueVaiFazer": "Descrição clara em linguagem do aluno, não técnica",
    "porQueImporta": "Conexão com vida real, próximas aulas ou interesse do adolescente",
    "doQuePreucisa": ["Material 1 específico", "Material 2", "Acesso a X"],
    "passos": [
      {
        "numero": 1,
        "nome": "Nome do passo",
        "duracao": "X min",
        "instrucao": "Instrução clara e específica — uma ação por passo",
        "dica": "Dica de estratégia (não de conteúdo)"
      },
      {
        "numero": 2,
        "nome": "Nome do passo",
        "duracao": "X min",
        "instrucao": "Instrução clara",
        "dica": "Dica"
      },
      {
        "numero": 3,
        "nome": "Nome do passo",
        "duracao": "X min",
        "instrucao": "Instrução clara",
        "dica": "Dica"
      }
    ],
    "comoSaberSeAcertou": "Critérios de autocorreção — como o aluno avalia o próprio trabalho",
    "seTravar": ["Estratégia 1: onde buscar ajuda", "Estratégia 2: como simplificar", "Estratégia 3: quem perguntar"],
    "querMaisDesafio": "Extensão opcional para alunos que terminarem rápido"
  },
  "paraProfessor": {
    "objetivo": "Conexão direta com objetivos da aula",
    "respostaEsperada": "Resposta modelo completa / gabarito",
    "errosComuns": [
      {"erro": "Erro provável 1", "causa": "Por que ocorre", "estrategia": "Como corrigir"},
      {"erro": "Erro provável 2", "causa": "Por que ocorre", "estrategia": "Como corrigir"}
    ],
    "rubrica": [
      {"nivel": "Excelente (A)", "descricao": "O que o aluno faz neste nível", "notaEquivalente": "9-10"},
      {"nivel": "Bom (B)", "descricao": "O que o aluno faz", "notaEquivalente": "7-8"},
      {"nivel": "Regular (C)", "descricao": "O que o aluno faz", "notaEquivalente": "5-6"},
      {"nivel": "Insuficiente (D)", "descricao": "O que o aluno faz", "notaEquivalente": "0-4"}
    ],
    "diferenciacao": {
      "comDificuldade": "Adaptação específica para alunos com dificuldade",
      "avancados": "Enriquecimento para alunos avançados"
    },
    "tempoCorrecao": "Estimativa de tempo para corrigir por aluno",
    "conexaoProximaAula": "Como esta tarefa alimenta e prepara a próxima aula"
  }
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nTipo: ${tipoTarefa}\nNível: ${nivel}\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook tarefa:", e);
    res.status(500).json({ erro: "Erro ao gerar tarefa" });
  }
});

// ─── POST /api/notebook/sequencia-didatica ────────────────────────────────────
// Tipo D: Sequência Didática multi-aula com avaliação integrada
router.post("/notebook/sequencia-didatica", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, numAulas = 4, duracaoAula = 50, nivel = "Ensino Médio" } = req.body as { docId: number; numAulas?: number; duracaoAula?: number; nivel?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.55,
      max_tokens: 5500,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em Design Instrucional criando uma SEQUÊNCIA DIDÁTICA profissional para ${numAulas} aulas de ${duracaoAula} minutos cada.
Nível: ${nivel}
A sequência deve ter progressão lógica: cada aula constrói sobre a anterior. O produto final deve ser significativo e avaliável.
SEMPRE inclua: mapa visual da sequência, conexão entre aulas, avaliação integrada com rúbrica por dimensões.

Retorne APENAS JSON válido:
{
  "titulo": "Título da sequência didática (unidade temática específica)",
  "nivel": "${nivel}",
  "duracaoTotal": "${numAulas} aulas × ${duracaoAula} min = ${numAulas * duracaoAula} min",
  "produtoFinal": "Descrição do que os alunos produzem/apresentam ao final da sequência",
  "avaliacaoSomativa": "Como será a avaliação final — instrumento e critérios",
  "objetivo": "Objetivo central de aprendizagem de toda a sequência",
  "bncc": {
    "competencia": "Competência BNCC principal",
    "habilidades": ["Habilidade 1", "Habilidade 2"]
  },
  "mapaDaSequencia": [
    {"numero": 1, "tema": "Tema da aula 1", "conceito": "Conceito chave", "conexaoAnterior": null},
    {"numero": 2, "tema": "Tema da aula 2", "conceito": "Conceito chave", "conexaoAnterior": "Como conecta com aula 1"},
    {"numero": 3, "tema": "Tema da aula 3", "conceito": "Conceito chave", "conexaoAnterior": "Como conecta com aula 2"},
    {"numero": 4, "tema": "Tema da aula 4", "conceito": "Síntese", "conexaoAnterior": "Como integra tudo"}
  ],
  "aulas": [
    {
      "numero": 1,
      "titulo": "Título específico da aula 1",
      "objetivos": ["Objetivo comportamental 1", "Objetivo 2"],
      "atividadePrincipal": "Descrição da atividade central desta aula",
      "recursos": ["Recurso 1", "Recurso 2"],
      "avaliacaoFormativa": "Como verificar aprendizado ao final desta aula",
      "conexaoProxima": "O que esta aula prepara na próxima"
    }
  ],
  "avaliacaoIntegrada": {
    "instrumento": "Descrição completa do instrumento final (projeto, seminário, produção, etc.)",
    "rubrica": [
      {"dimensao": "Dimensão 1", "peso": "30%", "criterios": "Descrição dos critérios para esta dimensão"},
      {"dimensao": "Dimensão 2", "peso": "40%", "criterios": "Descrição"},
      {"dimensao": "Dimensão 3", "peso": "30%", "criterios": "Descrição"}
    ]
  },
  "recursos": {
    "permanentes": ["Material usado em toda a sequência"],
    "porAula": [
      {"aula": 1, "lista": ["Material específico da aula 1"]},
      {"aula": 2, "lista": ["Material específico da aula 2"]}
    ]
  }
}
Gere exatamente ${numAulas} aulas no array "aulas" e no "mapaDaSequencia".`,
        },
        { role: "user", content: `Tema: "${row.title}"\nNível: ${nivel}\n${numAulas} aulas de ${duracaoAula} min\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook sequencia-didatica:", e);
    res.status(500).json({ erro: "Erro ao gerar sequência didática" });
  }
});

// ─── POST /api/notebook/aula-viva ────────────────────────────────────────────
// Tipo 2: Aula Viva — roteiro de programa de TV/streaming para a aula
router.post("/notebook/aula-viva", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, genero = "Series", duracao = 50, perfilTurma = "heterogenea" } = req.body as { docId: number; genero?: string; duracao?: number; perfilTurma?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.75,
      max_tokens: 5000,
      messages: [
        {
          role: "system",
          content: `Você é roteirista de TV educacional criando uma AULA VIVA — aula no formato de programa de streaming.
Gênero: ${genero} | Duração: ${duracao} min | Perfil: ${perfilTurma}

REGRAS DE ROTEIRO:
- Gancho cinematográfico nos primeiros 30 segundos
- Pico de tensão aos 2/3 do tempo
- Ritmo: alternância de alta e média energia
- Diálogos realistas e naturais (não didáticos forçados)
- Cliffhanger para a próxima aula

Retorne APENAS JSON válido:
{
  "titulo": "Título do episódio (estilo Netflix/Globoplay)",
  "subtitulo": "Tagline impactante de 1 frase",
  "genero": "${genero}",
  "duracaoTotal": "${duracao} minutos",
  "classificacao": "Livre",
  "trilhaSonora": "Estilo musical recomendado (lo-fi, MPB, indie, etc.)",
  "elenco": {
    "host": "Professor — tom e perfil para este episódio",
    "especialistaConvidado": "Papel do aluno avançado ou vídeo convidado",
    "publico": "Como os demais alunos participam"
  },
  "snapshotExecutivo": {
    "oQueVaoAprender": "Competência específica em 1 frase",
    "porQueImporta": "Conexão com vida real em 1 frase",
    "comoVaoAprender": "Estratégia principal",
    "comoSaberemos": "Evidência de aprendizagem"
  },
  "cenas": [
    {
      "numero": 1,
      "nome": "Abertura / VT de Entrada",
      "tipo": "vinheta",
      "duracao": "2 min",
      "trilha": "Música específica",
      "conteudoVisual": "O que aparece — descrição detalhada",
      "falaHost": "Texto completo da fala, com gancho e energia",
      "transicao": "Como entra na próxima cena"
    },
    {
      "numero": 2,
      "nome": "No Episódio Anterior...",
      "tipo": "recapitulacao",
      "duracao": "1 min",
      "trilha": "Música de recapitulação",
      "conteudoVisual": "O que aparece",
      "falaHost": "Resumo dramático do que já foi visto",
      "transicao": "Lead-in para o problema desta semana"
    },
    {
      "numero": 3,
      "nome": "Problema da Semana / Missão",
      "tipo": "gancho",
      "duracao": "3 min",
      "trilha": "Música de tensão crescente",
      "conteudoVisual": "Contexto visual que cria tensão",
      "falaHost": "Desafio explícito + recompensa se conseguirem resolver",
      "transicao": "Entrada na ação"
    },
    {
      "numero": 4,
      "nome": "Desenvolvimento — Ato 1",
      "tipo": "acao",
      "duracao": "${Math.round(duracao * 0.25)} min",
      "trilha": "Música de ação moderada",
      "conteudoVisual": "Atividade e recursos visuais",
      "falaHost": "Explicação em formato de apresentador, não de professor",
      "pontoDeVirada": "Momento que muda a direção",
      "transicao": "Pausa ativa"
    },
    {
      "numero": 5,
      "nome": "Pausa Ativa / Comercial",
      "tipo": "comercial",
      "duracao": "2 min",
      "trilha": "Música energizante",
      "conteudoVisual": "Atividade física ou mental rápida",
      "falaHost": "Teaser do que vem: 'Não saia daí...'",
      "transicao": "Retorno com energia renovada"
    },
    {
      "numero": 6,
      "nome": "Desenvolvimento — Ato 2",
      "tipo": "acao",
      "duracao": "${Math.round(duracao * 0.25)} min",
      "trilha": "Música de intensidade crescente",
      "conteudoVisual": "Mesma estrutura do ato 1, intensidade maior",
      "falaHost": "Aprofundamento com mais dramaticidade",
      "pontoDeVirada": "Aproximação do clímax",
      "transicao": "Tensão máxima"
    },
    {
      "numero": 7,
      "nome": "Clímax / Revelação",
      "tipo": "climax",
      "duracao": "5 min",
      "trilha": "Música épica ou de revelação",
      "conteudoVisual": "Momento de descoberta e resolução",
      "falaHost": "A revelação/solução — entregue com dramaticidade",
      "reacaoElenco": "Como turma celebra ou compreende o momento",
      "transicao": "Euforia controlada → fechamento"
    },
    {
      "numero": 8,
      "nome": "Fechamento / Próximo Episódio",
      "tipo": "fechamento",
      "duracao": "2 min",
      "trilha": "Música tema final",
      "conteudoVisual": "Síntese visual elegante",
      "falaHost": "Síntese emocional (não repetição) + cliffhanger da próxima aula",
      "cliffhanger": "Gancho que deixa querendo mais — primeira linha do próximo episódio",
      "creditos": "Tarefa de casa apresentada como 'missão pós-episódio'"
    }
  ],
  "guiaDeDirecao": {
    "ritmoDaAula": [
      {"momento": "0-2 min", "energia": "alta", "descricao": "Abertura impactante"},
      {"momento": "2-5 min", "energia": "media", "descricao": "Contexto do problema"},
      {"momento": "5-${Math.round(duracao * 0.5)} min", "energia": "alta", "descricao": "Ação e aprendizagem"},
      {"momento": "${Math.round(duracao * 0.5)}-${Math.round(duracao * 0.5) + 2} min", "energia": "baixa", "descricao": "Pausa ativa"},
      {"momento": "${Math.round(duracao * 0.5) + 2}-${duracao - 7} min", "energia": "alta", "descricao": "Ação intensa"},
      {"momento": "${duracao - 7}-${duracao - 2} min", "energia": "maxima", "descricao": "Clímax"},
      {"momento": "${duracao - 2}-${duracao} min", "energia": "media", "descricao": "Fechamento"}
    ],
    "cuidadosProducao": ["Testar projeção 10 min antes", "Ter plano B se tecnologia falhar", "Cronômetro visível"],
    "versoesAlternativas": {
      "cinema": "Versão mais dramática, mais recursos visuais",
      "podcast": "Versão só áudio, foco na conversa",
      "reality": "Competição entre grupos visível em tempo real",
      "documentario": "Tom mais sério, fatos reais em primeiro plano"
    }
  }
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nGênero: ${genero}\nDuração: ${duracao} min\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook aula-viva:", e);
    res.status(500).json({ erro: "Erro ao gerar Aula Viva" });
  }
});

// ─── POST /api/notebook/aula-viva-formato ─────────────────────────────────────
// /tools/aula_viva/jornal_da_aula.py | aula_chef.py | aula_investigacao.py | aula_talk_show.py
// 4 sub-formatos especializados de Aula Viva
router.post("/notebook/aula-viva-formato", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, formato = "jornal", duracao = 50, persona = "planejador" } = req.body as { docId: number; formato?: string; duracao?: number; persona?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const personaInfo = PERSONAS_EDU[persona] ?? PERSONAS_EDU["planejador"];

    const FORMATO_PROMPTS: Record<string, string> = {
      jornal: `Você é diretor de um JORNAL DA AULA — programa de TV de educação no formato telejornal.
ESTRUTURA DO TELEJORNAL:
- Vinheta de abertura + Chamadas das manchetes (1 min)
- Âncora principal apresenta o "Fato do Dia" = o conteúdo central (5 min)
- Correspondente de campo = aluno que pesquisou/apresenta dado (3 min)
- Plantão de curiosidades inusitadas relacionadas ao tema (2 min)
- Debate com "especialistas" = grupos de alunos com posições diferentes (10 min)
- Previsão do tempo do estudo = o que vem a seguir na matéria (2 min)
- Espaço do telespectador = dúvidas da turma (5 min)
- Encerramento com resumo e "fique de olho" (2 min)
Retorne JSON com: titulo, manchetes[3], abertura{ancora,chamadas[3]}, segmentos[]{nome,tipo,duracao,script,participantes}, plantaoCuriosidades[3], debate{tema,posicoes[],mediacao}, previsaoEstudo, encerramentoAncora, missaoPosEdicao`,
      chef: `Você é apresentador do programa AULA CHEF — gastronomia como metáfora pedagógica completa.
ESTRUTURA DA AULA CHEF:
- Mise en place: preparação e ingredientes do conteúdo (3 min)
- O Chef apresenta a receita = plano da aula (2 min)
- Ingredientes = conceitos fundamentais (com comparações a sabores: amargo, doce, complexo)
- Técnicas de preparo = metodologias de aprendizagem
- Erros comuns na cozinha = equívocos conceituais a evitar
- Degustação = exercício prático de avaliação
- Crítica gastronômica = autoavaliação do aluno
- Receita para casa = tarefa
LINGUAGEM: "O segredo desta receita é...", "Cuidado com o ponto...", "Cada paladar aprecia diferente..."
Retorne JSON com: titulo, mise_en_place{ingredientes[],utensilios[],tempoDePreparo}, receita{nome,porcoes,dificuldade}, etapas[]{nome,tecnica,ingredienteConceito,tempoDeAula,sinaisDePontoIdeal,errosComuns}, degustacao{instrumento,criterios[]}, criticaGastronomica{perguntas[]}, receitaCasa, cardapioProximaAula`,
      investigacao: `Você é roteirista de AULA INVESTIGAÇÃO — aula no formato de série policial/crime investigation.
ESTRUTURA DA INVESTIGAÇÃO:
- BOLETIM DE OCORRÊNCIA: crime = lacuna de conhecimento, investigadores = alunos (2 min)
- CENA DO CRIME: pistas espalhadas = conceitos fragmentados para descobrir (5 min)
- PERFIL DO SUSPEITO: o conceito mais difícil personificado como antagonista (3 min)
- TRABALHO DE CAMPO: alunos investigam em grupos (15 min)
- RECONSTITUIÇÃO: reconstrução lógica do conhecimento (8 min)
- JULGAMENTO: apresentação das conclusões com defesa e acusação (10 min)
- VEREDITO FINAL: síntese pedagógica + questão aberta para investigação futura (7 min)
ATMOSFERA: suspense, tensão intelectual, revelações progressivas.
Retorne JSON com: titulo, boletimOcorrencia{crime,investigadores,evidencias[]}, cenaCrime{pistas[],comoEspalhar}, perfilSuspeito{nome,caracteristicas[],pontoFraco}, investigacao{missao,grupos,materiais[]}, reconstituicao{script}, julgamento{acusacao,defesa,testemunhas[]}, vereditoFinal, proxoCaso`,
      talk_show: `Você é produtor do AULA TALK SHOW — talk show de entretenimento educacional.
ESTRUTURA DO TALK SHOW:
- COLD OPEN: cena cômica ou surpreendente relacionada ao tema (2 min)
- MONÓLOGO DO HOST: apresentador abre com história pessoal + punchlines educacionais (3 min)
- SEGMENTO "TOP 3": os 3 fatos mais importantes do tema (formato lista rápida) (5 min)
- ENTREVISTA DO DIA: professor "entrevista" um conceito personificado ou aluno especialista (8 min)
- MESA REDONDA: debate leve com posições diferentes (10 min)
- QUADRO FIXO "MITOS E VERDADES": desmistificar erros comuns (5 min)
- NÚMERO MUSICAL/ARTÍSTICO: forma criativa de fixar o conceito central (5 min)
- ENCERRAMENTO "SEMANA QUE VEM": teaser + tarefa como "promessa ao telespectador" (2 min)
TOM: leve, bem-humorado, mas com profundidade real. Nunca sacrifica o aprendizado pela piada.
Retorne JSON com: titulo, coldOpen{cena,punchline}, monologo{roteiro,piadas[],gancho}, top3[]{fato,porqueImporta}, entrevista{entrevistado,perguntas[],reveal_final}, mesaRedonda{topico,posicoes[]}, mitosVerdades[]{afirmacao,veredicto,explicacao}, numeroArtistico{forma,conteudo,participacao}, encerramento{teaser,tarefa}`,
    };

    const promptEspecifico = FORMATO_PROMPTS[formato] ?? FORMATO_PROMPTS["jornal"];
    const personaSystem = getPersonaSystem(persona);

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.8,
      max_tokens: 4500,
      messages: [
        {
          role: "system",
          content: `PERSONA: ${personaInfo.nome} — ${personaInfo.tom}\n\n${promptEspecifico}\n\nRetorne APENAS JSON válido com a estrutura especificada acima. Adapte todo o conteúdo ao tema fornecido pelo usuário. Seja específico, criativo e pedagogicamente sólido.`,
        },
        { role: "user", content: `Tema: "${row.title}"\nFormato: ${formato}\nDuração: ${duracao} minutos\nPersona: ${personaInfo.nome}\n\nConteúdo:\n${row.content_text.slice(0, 12_000)}` },
      ],
    });
    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json({ formato, tema: row.title, persona: personaInfo.nome, ...JSON.parse(clean) });
  } catch (e) {
    console.error("notebook aula-viva-formato:", e);
    res.status(500).json({ erro: "Erro ao gerar formato da Aula Viva" });
  }
});

// ─── POST /api/notebook/avaliacao-voz ─────────────────────────────────────────
// /endpoints/avaliacao_voz.py — Tipo 6: Avaliação Oral, Entrevista Simulada e Debate
router.post("/notebook/avaliacao-voz", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, tipoAvaliacao = "entrevista", nivel = "Ensino Médio", persona = "planejador" } = req.body as { docId: number; tipoAvaliacao?: string; nivel?: string; persona?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const personaInfo = PERSONAS_EDU[persona] ?? PERSONAS_EDU["planejador"];

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.65,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `Você é especialista em avaliação oral e comunicação pedagógica (Persona: ${personaInfo.nome}).
${personaInfo.instrucoes}

Crie uma AVALIAÇÃO POR VOZ completa para o tema fornecido. Retorne APENAS JSON válido:
{
  "tema": "Título do tema",
  "tipoAvaliacao": "${tipoAvaliacao}",
  "persona": "${personaInfo.nome}",
  "nivel": "${nivel}",

  "podcast": {
    "titulo": "Nome do episódio podcast avaliativo",
    "duracao": "X minutos",
    "formato": "Solo / Dupla / Painel",
    "roteiro": [
      {"momento": "Abertura (X min)", "script": "O que o aluno fala", "dica": "Como apresentar bem"},
      {"momento": "Desenvolvimento (X min)", "script": "Argumentação central", "dica": "Tom e ritmo"},
      {"momento": "Síntese (X min)", "script": "Conclusão memorável", "dica": "Como terminar forte"}
    ],
    "criteriosAvaliacao": [
      {"criterio": "Clareza conceitual", "peso": "30%", "indicadores": ["O aluno definiu corretamente", "Usou exemplos"]},
      {"criterio": "Argumentação", "peso": "30%", "indicadores": ["Usou evidências", "Respondeu objeções"]},
      {"criterio": "Comunicação oral", "peso": "20%", "indicadores": ["Volume adequado", "Sem vícios de linguagem"]},
      {"criterio": "Criatividade/Engajamento", "peso": "20%", "indicadores": ["Formato original", "Cativou ouvinte"]}
    ]
  },

  "entrevistaSimulada": {
    "formato": "Entrevista de rádio / bancada / podcast",
    "papel_entrevistador": "Professor ou aluno par",
    "abertura": "Como o entrevistador se apresenta",
    "perguntas": [
      {"numero": 1, "tipo": "abertura", "pergunta": "Pergunta de aquecimento", "resposta_esperada": "O que boa resposta contém", "followup": "Pergunta de aprofundamento"},
      {"numero": 2, "tipo": "conceitual", "pergunta": "Pergunta sobre definição ou mecanismo", "resposta_esperada": "Elementos essenciais", "followup": "E em outros contextos?"},
      {"numero": 3, "tipo": "aplicacao", "pergunta": "Situação real que exige o conceito", "resposta_esperada": "Aplicação correta", "followup": "O que mudaria se...?"},
      {"numero": 4, "tipo": "critico", "pergunta": "Pergunta que desafia o conceito ou cria dilema", "resposta_esperada": "Análise crítica", "followup": "Como você defende sua posição?"},
      {"numero": 5, "tipo": "sintese", "pergunta": "O que você levaria desta aula para a vida?", "resposta_esperada": "Conexão pessoal real", "followup": ""}
    ],
    "rubricas_entrevista": ["Fluência verbal", "Precisão conceitual", "Capacidade de exemplificar", "Resposta às perguntas inesperadas"]
  },

  "debateEstruturado": {
    "tese": "Afirmação controversa ou dilema relacionado ao tema",
    "grupos": [
      {"nome": "Time A — Defesa", "posicao": "Argumenta a favor da tese", "argumentos": ["Argumento 1 com base no conteúdo", "Argumento 2", "Argumento 3"]},
      {"nome": "Time B — Oposição", "posicao": "Argumenta contra a tese", "argumentos": ["Contra-argumento 1", "Contra-argumento 2", "Contra-argumento 3"]}
    ],
    "estrutura_debate": [
      {"rodada": "1ª Rodada — Abertura", "tempo": "2 min cada", "instrucao": "Cada grupo apresenta sua posição principal"},
      {"rodada": "2ª Rodada — Réplica", "tempo": "1 min cada", "instrucao": "Responde ao argumento adversário"},
      {"rodada": "3ª Rodada — Perguntas da plateia", "tempo": "3 min", "instrucao": "Outros alunos fazem perguntas"},
      {"rodada": "Conclusão", "tempo": "1 min cada", "instrucao": "Síntese final irrefutável"}
    ],
    "papel_mediador": "Como o professor media sem interferir no conteúdo",
    "criterio_vencedor": "Como determinar vencedor (sem humilhação)",
    "reflexao_final": "Pergunta unificadora após o debate"
  }
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nNível: ${nivel}\nTipo principal: ${tipoAvaliacao}\n\nConteúdo:\n${row.content_text.slice(0, 12_000)}` },
      ],
    });
    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook avaliacao-voz:", e);
    res.status(500).json({ erro: "Erro ao gerar Avaliação por Voz" });
  }
});

// ─── POST /api/notebook/making-of ─────────────────────────────────────────────
// /endpoints/making_of.py — Tipo 8: Making Of da Aula (bastidores pedagógicos)
router.post("/notebook/making-of", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, persona = "planejador" } = req.body as { docId: number; persona?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const personaInfo = PERSONAS_EDU[persona] ?? PERSONAS_EDU["planejador"];

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.7,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Você é ${personaInfo.nome}. ${personaInfo.instrucoes}
Tom: ${personaInfo.tom}

Crie o MAKING OF DA AULA — o documentário dos bastidores pedagógicos. Explique as decisões por trás do design instrucional.
Retorne APENAS JSON válido:
{
  "tema": "Título",
  "persona": "${personaInfo.nome}",
  "tag": "Making Of Pedagógico",

  "historiaDoConteudo": {
    "origemDoTema": "Por que este tema existe? Quem o criou ou descobriu? Qual o contexto histórico?",
    "evolucoesChave": ["Como o entendimento deste tema mudou ao longo do tempo — 3 marcos"],
    "controversiasExistentes": "O que ainda é debatido ou mal compreendido sobre este tema",
    "conexoesSurpreendentes": ["3 conexões inesperadas com outros campos do conhecimento"]
  },

  "decisoesPedagogicas": [
    {
      "decisao": "Por que começar com este gancho?",
      "racionalidade": "Base teórica (Ausubel, Vygotsky, etc.)",
      "alternativaRejeitada": "O que eu poderia ter feito, mas não fiz",
      "porque": "Por que a decisão tomada é melhor para esta turma"
    },
    {
      "decisao": "Por que esta sequência de atividades?",
      "racionalidade": "Teoria da aprendizagem aplicada",
      "alternativaRejeitada": "Sequência alternativa descartada",
      "porque": "Justificativa pedagógica"
    },
    {
      "decisao": "Por que esta forma de avaliação?",
      "racionalidade": "Coerência com objetivos e atividades",
      "alternativaRejeitada": "Avaliação mais fácil que foi rejeitada",
      "porque": "O que esta avaliação revela que a outra não revelaria"
    }
  ],

  "errosQueJaCometei": [
    {"erro": "Erro pedagógico cometido ao ensinar este tema", "consequencia": "O que aconteceu na turma", "aprendizado": "Como corrigi e o que mudou"},
    {"erro": "Segundo erro comum", "consequencia": "Impacto nos alunos", "aprendizado": "A lição"}
  ],

  "segredosDoProfissional": [
    {"segredo": "Técnica ou insight que não está em nenhum livro didático", "contexto": "Quando usar", "aviso": "Quando NÃO usar"},
    {"segredo": "Segundo segredo", "contexto": "Contexto ideal", "aviso": "Limitação"},
    {"segredo": "Terceiro segredo", "contexto": "Contexto ideal", "aviso": "Limitação"}
  ],

  "antesDeAmanh": {
    "o_que_preparar": ["Lista concreta do que preparar antes da aula"],
    "testar_antes": ["O que sempre testar antes de apresentar à turma"],
    "mentalidade": "Estado mental ideal para dar esta aula"
  },

  "reflexaoHonesta": {
    "oQueMaisGosto": "O que o professor mais aprecia neste conteúdo",
    "oQueMaisTeio": "O que é difícil de ensinar e por quê",
    "mensagemAosAlunos": "O que o professor quer que os alunos entendam além do conteúdo"
  }
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nPersona: ${personaInfo.nome}\n\nConteúdo:\n${row.content_text.slice(0, 12_000)}` },
      ],
    });
    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook making-of:", e);
    res.status(500).json({ erro: "Erro ao gerar Making Of" });
  }
});

// ─── POST /api/notebook/simulador-aula ────────────────────────────────────────
// /endpoints/simulador_aula.py — Tipo 7: Simulador de Aula com 5 alunos-tipo virtuais
router.post("/notebook/simulador-aula", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, nivel = "Ensino Médio", persona = "planejador" } = req.body as { docId: number; nivel?: string; persona?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const personaInfo = PERSONAS_EDU[persona] ?? PERSONAS_EDU["planejador"];

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.75,
      max_tokens: 4500,
      messages: [
        {
          role: "system",
          content: `Você é ${personaInfo.nome} simulando uma aula completa com 5 perfis de alunos reais.
${personaInfo.instrucoes}

Crie um SIMULADOR DE AULA — ensaio interativo com turma virtual de 5 alunos-tipo.
Retorne APENAS JSON válido:
{
  "tema": "Título",
  "persona": "${personaInfo.nome}",
  "nivel": "${nivel}",

  "turmaVirtual": [
    {
      "nome": "Ana",
      "perfil": "A Entusiasta",
      "descricao": "Muito motivada, faz muitas perguntas, às vezes dispersa o restante da turma",
      "pontoForte": "Conexões criativas e interesse genuíno",
      "pontoFraco": "Dificuldade de aprofundar sem dispersar",
      "comoEngajar": "Como aproveitar a energia dela produtivamente",
      "sinalDeEngajamento": "Como saber que Ana está aprendendo",
      "sinalDePerda": "Como perceber que perdeu o fio"
    },
    {
      "nome": "Carlos",
      "perfil": "O Resistente",
      "descricao": "Acha a matéria inútil, questiona por que precisa aprender isso",
      "pontoForte": "Pensamento crítico genuíno quando engajado",
      "pontoFraco": "Resistência pode contaminar outros",
      "comoEngajar": "Como transformar resistência em força motriz",
      "sinalDeEngajamento": "Quando Carlos começa a participar genuinamente",
      "sinalDePerda": "Comportamentos de desengajamento"
    },
    {
      "nome": "Beatriz",
      "perfil": "A Silenciosa Brilhante",
      "descricao": "Entende tudo mas raramente se manifesta, tem medo de errar em público",
      "pontoForte": "Profundidade de análise quando estimulada",
      "pontoFraco": "Invisível se o professor não a incluir ativamente",
      "comoEngajar": "Como criar espaço seguro para ela participar",
      "sinalDeEngajamento": "Sinais sutis de que está acompanhando",
      "sinalDePerda": "Como perceber que se desconectou"
    },
    {
      "nome": "Diego",
      "perfil": "O Com Dificuldade Real",
      "descricao": "Lacunas de aprendizagem de séries anteriores, sente-se menos capaz",
      "pontoForte": "Perseverança quando recebe suporte adequado",
      "pontoFraco": "Pode se perder na primeira complexidade",
      "comoEngajar": "Estratégias de scaffolding específicas para este conteúdo",
      "sinalDeEngajamento": "Pequenos avanços que merecem celebração",
      "sinalDePerda": "Quando precisa de intervenção imediata"
    },
    {
      "nome": "Fernanda",
      "perfil": "A Avançada Que Se Entedia",
      "descricao": "Já sabe grande parte do conteúdo, fica impaciente com o ritmo da turma",
      "pontoForte": "Pode ser co-educadora se bem aproveitada",
      "pontoFraco": "Comportamentos disruptivos quando entediada",
      "comoEngajar": "Extensões e desafios específicos para este conteúdo",
      "sinalDeEngajamento": "Quando está sendo realmente desafiada",
      "sinalDePerda": "Comportamentos de desengajamento de aluno avançado"
    }
  ],

  "simulacaoMomento": [
    {
      "momento": "Abertura — primeiros 5 minutos",
      "script_professor": "O que o professor faz e diz exatamente",
      "reacao_ana": "Como Ana reage",
      "reacao_carlos": "Como Carlos reage",
      "reacao_beatriz": "Como Beatriz reage",
      "reacao_diego": "Como Diego reage",
      "reacao_fernanda": "Como Fernanda reage",
      "intervencao_necessaria": "Se/como professor intervém nas reações",
      "aprendizado_do_ensaio": "O que o professor aprende sobre a abertura"
    },
    {
      "momento": "Desenvolvimento — conceito central",
      "script_professor": "Como o professor apresenta o conceito-chave",
      "reacao_ana": "Reação: pergunta inesperada que Ana faz",
      "reacao_carlos": "Questionamento ou resistência de Carlos",
      "reacao_beatriz": "Sinal sutil de que entendeu ou não",
      "reacao_diego": "Confusão específica que Diego demonstra",
      "reacao_fernanda": "Comportamento de Fernanda (entediada ou engajada)",
      "intervencao_necessaria": "Como o professor lida com cada reação",
      "aprendizado_do_ensaio": "O que refinar neste momento"
    },
    {
      "momento": "Atividade em grupo",
      "script_professor": "Como organiza e instrui os grupos",
      "reacao_ana": "Papel de Ana no grupo",
      "reacao_carlos": "Como Carlos se posiciona",
      "reacao_beatriz": "Dinâmica de Beatriz no grupo",
      "reacao_diego": "Dificuldade específica que Diego enfrenta",
      "reacao_fernanda": "Como Fernanda usa (ou mal-usa) seu avanço",
      "intervencao_necessaria": "Micro-intervenções por grupo",
      "aprendizado_do_ensaio": "O que ajustar na dinâmica"
    },
    {
      "momento": "Fechamento e avaliação formativa",
      "script_professor": "Como encerra e avalia",
      "reacao_ana": "Participação no fechamento",
      "reacao_carlos": "Mudança ou manutenção da resistência",
      "reacao_beatriz": "Se se manifestou ou não",
      "reacao_diego": "O que conseguiu ou não consolidar",
      "reacao_fernanda": "Nível de satisfação com o que aprendeu",
      "intervencao_necessaria": "Ajustes finais",
      "aprendizado_do_ensaio": "O grande aprendizado desta simulação"
    }
  ],

  "leituraDeRiscos": [
    {"risco": "Situação que pode dar errado nesta aula", "probabilidade": "Alta/Média/Baixa", "prevencao": "O que fazer antes", "plano_b": "O que fazer se acontecer"},
    {"risco": "Segundo risco", "probabilidade": "Alta/Média/Baixa", "prevencao": "Prevenção", "plano_b": "Plano B"},
    {"risco": "Terceiro risco", "probabilidade": "Alta/Média/Baixa", "prevencao": "Prevenção", "plano_b": "Plano B"}
  ],

  "conclusaoDoEnsaio": {
    "o_que_ajustar": ["3 ajustes concretos no plano antes de dar a aula"],
    "o_que_manter": ["2 pontos fortes que devem ser mantidos"],
    "foco_do_professor": "O que o professor deve monitorar com atenção especial",
    "mantra_da_aula": "1 frase que resume o espírito desta aula"
  }
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nNível: ${nivel}\nPersona: ${personaInfo.nome}\n\nConteúdo:\n${row.content_text.slice(0, 12_000)}` },
      ],
    });
    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook simulador-aula:", e);
    res.status(500).json({ erro: "Erro ao gerar Simulador de Aula" });
  }
});

// ─── POST /api/notebook/validador-pares ───────────────────────────────────────
// /core/validador_pares.py — Validação de plano por 3 IAs (Veterano + Inclusão + Pesquisador)
router.post("/notebook/validador-pares", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, planoTexto, tema } = req.body as { docId?: number; planoTexto?: string; tema?: string };
  try {
    let conteudo = planoTexto ?? "";
    let titulo = tema ?? "Plano de Aula";
    if (docId && !planoTexto) {
      const docs = await db.execute(sql`SELECT content_text, title FROM knowledge_documents WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1`);
      const row = (docs.rows as any[])[0];
      if (row) { conteudo = row.content_text; titulo = row.title; }
    }
    const feedbacks = await validarPares(conteudo.slice(0, 4000), titulo);
    res.json({ tema: titulo, validacao: feedbacks });
  } catch (e) {
    console.error("notebook validador-pares:", e);
    res.status(500).json({ erro: "Erro na validação por pares" });
  }
});

// ─── POST /api/notebook/micro-aulas ──────────────────────────────────────────
// Tipo 5: Micro-Aulas — conteúdo em doses TikTok/Shorts/Podcast
router.post("/notebook/micro-aulas", async (req: Request, res: Response) => {
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
      model: OR.fast,
      temperature: 0.7,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `Você é criador de conteúdo educacional para redes sociais, especialista em micro-aprendizagem (microlearning).
Você transforma conteúdo complexo em versões curtas, impactantes e virais — mantendo a precisão pedagógica.
ESTILO: linguagem jovem, direta, sem enrolação. Cada segundo conta.

Retorne APENAS JSON válido:
{
  "tema": "Tema central",
  "conceito15s": {
    "hookVisual": "O que aparece nos primeiros 3 segundos",
    "textNaTela": "Máximo 5 palavras — impactante",
    "fala": "1 frase máximo 12 palavras — o conceito em estado puro",
    "callToAction": "Ação que o aluno deve tomar (seguir, comentar, salvar)",
    "hashtags": ["#tema", "#enem", "#estudos", "#studyai"]
  },
  "versao60s": {
    "estrutura": [
      {"segundo": "0-3s", "conteudo": "Gancho visual + pergunta provocadora"},
      {"segundo": "3-15s", "conteudo": "Problema/contexto — por que importa"},
      {"segundo": "15-45s", "conteudo": "Explicação principal — 1 conceito apenas"},
      {"segundo": "45-55s", "conteudo": "Exemplo visual memorável"},
      {"segundo": "55-60s", "conteudo": "Call to action + teaser do próximo vídeo"}
    ],
    "roteiro": "Fala completa com marcações de tempo",
    "elementosVisuais": "O que aparece em cada bloco de tempo",
    "musica": "Estilo de trilha recomendado"
  },
  "versao3min": {
    "gancho": "Primeira frase que prende atenção",
    "contexto": "Por que este tema importa — 30s",
    "conteudo": "Explicação principal com exemplo — 90s",
    "aplicacao": "Como usar no ENEM ou vida real — 30s",
    "fechamento": "Resumo de 1 frase + desafio para o aluno — 30s",
    "roteiro": "Roteiro completo de 3 minutos"
  },
  "versao10min": {
    "descricao": "Versão commute/exercício — pode ouvir sem olhar",
    "estrutura": [
      {"minuto": "0-1", "conteudo": "Introdução e contexto"},
      {"minuto": "1-4", "conteudo": "Conceito principal com exemplos vívidos"},
      {"minuto": "4-7", "conteudo": "Aprofundamento e conexões"},
      {"minuto": "7-9", "conteudo": "Aplicação prática e ENEM"},
      {"minuto": "9-10", "conteudo": "Síntese e desafio"}
    ],
    "roteiro": "Roteiro completo estilo podcast educacional"
  },
  "serieDeMicroAulas": [
    {"episodio": 1, "titulo": "Gancho inicial", "conceito": "O problema que esta série resolve"},
    {"episodio": 2, "titulo": "Aprofundamento", "conceito": "O conceito principal"},
    {"episodio": 3, "titulo": "Aplicação", "conceito": "Como usar na prática"},
    {"episodio": 4, "titulo": "Erros Comuns", "conceito": "O que todo mundo erra e como evitar"},
    {"episodio": 5, "titulo": "Síntese e Desafio", "conceito": "Consolidação + desafio final"}
  ],
  "dicasProducao": ["Dica de produção para professores que queiram gravar os vídeos"]
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook micro-aulas:", e);
    res.status(500).json({ erro: "Erro ao gerar micro-aulas" });
  }
});

// ─── POST /api/notebook/narrativa ────────────────────────────────────────────
// Tipo 4: Narrativa Didática — transforma conteúdo em história envolvente
router.post("/notebook/narrativa", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, nivel = "Ensino Médio" } = req.body as { docId: number; nivel?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.8,
      max_tokens: 4500,
      messages: [
        {
          role: "system",
          content: `Você é um escritor e pedagogo criando uma NARRATIVA DIDÁTICA — uma história onde o conteúdo educacional é vivido, não apenas explicado.
O aluno é o PROTAGONISTA da aventura. O professor é o MENTOR (estilo Gandalf/Yoda). O conteúdo é o DESAFIO/MISSÃO a superar.
Nível: ${nivel}

Retorne APENAS JSON válido:
{
  "titulo": "Título da história (como livro ou série de fantasia/ficção)",
  "genero": "Aventura | Ficção Científica | Mistério | Fantasia | Thriller",
  "universo": {
    "cenario": "Onde e quando se passa (ex: 'Um laboratório em 2045' / 'Uma vila medieval')",
    "grandeProblema": "A ameaça/missão que precisa ser resolvida (conectada ao conteúdo)",
    "stakesEmocionais": "O que acontece se o protagonista falhar — consequência dramática"
  },
  "personagens": {
    "protagonista": {
      "nome": "Nome sugerido ou 'Você'",
      "papel": "Cientista | Detetive | Herói | Explorador | Engenheiro",
      "habilidadeEspecial": "O que o aluno já sabe que vai ajudar na missão",
      "arcoTransformacao": "Do estado inicial ao estado final após a aventura"
    },
    "mentor": {
      "papel": "Papel na história (Gandalf | Yoda | Dumbledore | Mentora prática)",
      "comoAjuda": "Dá ferramentas, faz perguntas, dá feedback sem entregar respostas",
      "limitacao": "O que o mentor NÃO pode fazer por eles"
    },
    "aliados": "Como os colegas funcionam — equipe com habilidades complementares",
    "antagonista": "O conceito difícil ou vilão personificado que representa o obstáculo"
  },
  "estruturaDramatica": {
    "ato1": {
      "mundoComum": "Como é antes da aventura — o que sabem, o que não sabem",
      "incidenteIncitante": "O que muda tudo e inicia a missão",
      "recusaDoChamado": "Por que é difícil — a resistência inicial",
      "encontroComMentor": "Professor apresenta ferramentas/conhecimento"
    },
    "ato2": {
      "cruzamentoPrimeirLimiar": "Momento em que entram de corpo e alma",
      "provasAliados": "Desafios superados, parceiros encontrados, obstáculos vencidos",
      "provacaoSuprema": "O momento mais difícil — tudo ou nada — o exame do ENEM?",
      "recompensa": "O que conquistam — a aprendizagem como tesouro"
    },
    "ato3": {
      "caminhoDeVolta": "Como aplicam o que aprenderam no mundo real",
      "ressureicao": "Último teste que prova que realmente aprenderam",
      "retornoComElixir": "Compartilham conhecimento com os colegas/comunidade"
    }
  },
  "elementosLudicos": {
    "itensColeta veis": "O que 'ganham' ao longo da jornada (informações, ferramentas, aliados)",
    "niveisProgresso": "Como sabem que estão avançando (visual, pontos, badges)",
    "easterEggs": "Descobertas opcionais para quem se aprofunda além do básico",
    "finaisAlternativos": "Se fizerem X, desfecho Y; se fizerem Z, desfecho W"
  },
  "roteiroPorCena": [
    {
      "cena": 1,
      "titulo": "Nome da cena",
      "tempoDaAula": "0-X min",
      "narrativa": "O que acontece na história — descrição dramática",
      "conteudoEducacional": "O conteúdo que está sendo aprendido nesta cena",
      "falaDoMentor": "Diálogo do professor no papel de mentor",
      "decisaoDosPersonagens": "Escolha que os alunos precisam fazer"
    }
  ],
  "avaliacaoNarrativa": {
    "oQueProtagonistaMprendeu": "Evidências de aprendizagem dentro da narrativa",
    "comoOGrupoEvoluiu": "Colaboração e resolução de conflitos",
    "versaoDaHistoria": "Como seria diferente se tivessem feito escolhas diferentes"
  }
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nNível: ${nivel}\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook narrativa:", e);
    res.status(500).json({ erro: "Erro ao gerar narrativa didática" });
  }
});

// ─── POST /api/notebook/remix-cultural ───────────────────────────────────────
// Tipo 11: Remix Cultural — conecta conteúdo com cultura pop dos alunos
router.post("/notebook/remix-cultural", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, nivel = "Ensino Médio" } = req.body as { docId: number; nivel?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.85,
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: `Você é um professor inovador e criativo, expert em conectar conteúdo educacional com a cultura pop que os alunos brasileiros REALMENTE vivem em 2024-2025.
Você usa referências de músicas (funk, sertanejo, pop, trap), séries (Netflix/Globo), jogos (Fortnite, Roblox, Free Fire), memes virais, esportes e celebridades atuais.
NUNCA use referências antigas ou desatualizadas. Seja genuinamente relevante para adolescentes brasileiros de ${nivel}.

Retorne APENAS JSON válido:
{
  "tema": "Tema educacional",
  "mapeamentoReferencias": [
    {"categoria": "Música", "referencia": "Artista/música atual relevante", "conexaoPedagogica": "Como conecta com o conteúdo"},
    {"categoria": "Série/Filme", "referencia": "Lançamento popular", "conexaoPedagogica": "Conexão pedagógica"},
    {"categoria": "Jogo", "referencia": "Jogo em alta entre jovens", "conexaoPedagogica": "Analogia com o conteúdo"},
    {"categoria": "Meme", "referencia": "Formato de meme viral", "conexaoPedagogica": "Versão educacional do meme"},
    {"categoria": "Esporte", "referencia": "Evento esportivo atual", "conexaoPedagogica": "Conexão pedagógica"},
    {"categoria": "Celebridade", "referencia": "Notícia/celebridade relevante", "conexaoPedagogica": "Conexão pedagógica"}
  ],
  "aulaRemixada": {
    "gancho": "Frase de abertura usando referência cultural — ex: '[Referência] virou notícia essa semana. Vocês viram? Sabe o que isso tem a ver com [conteúdo]?'",
    "desenvolvimento": "Como o conteúdo é ensinado ATRAVÉS da referência cultural — passo a passo",
    "aprofundamento": "Como a referência ilustra, exemplifica ou questiona o conteúdo educacional",
    "critica": "Onde a referência acerta e onde simplifica demais — pensamento crítico",
    "produto": "O que os alunos criam (meme educativo, versão da música, cena reescrita, etc.)"
  },
  "memesEducacionais": [
    {
      "formato": "Nome do formato de meme (ex: 'Drake pointing', 'Woman Yelling at Cat')",
      "imagemDescricao": "Descrição da imagem base",
      "textoSuperior": "Setup — a situação errada/difícil",
      "textoInferior": "Punchline educativa — a solução/conceito correto"
    },
    {
      "formato": "Outro formato",
      "imagemDescricao": "Descrição",
      "textoSuperior": "Setup",
      "textoInferior": "Punchline"
    }
  ],
  "playlistDaAula": {
    "musicasQueExplicam": [
      {"musica": "Nome — Artista", "comoConecta": "Como esta música exemplifica o conteúdo"}
    ],
    "trilhaSonoraPara Estudar": "Estilo/playlist recomendada para estudar este tema"
  },
  "conexoesSurpreendentes": [
    "Este tema aparece em [lugar inesperado] porque...",
    "Conexão 2",
    "Conexão 3"
  ],
  "fraseDeEngajamento": "Frase de 1 linha para postar no Instagram/WhatsApp do professor que vai fazer os alunos quererem entrar na aula"
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nNível: ${nivel}\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook remix-cultural:", e);
    res.status(500).json({ erro: "Erro ao gerar remix cultural" });
  }
});

// ─── POST /api/notebook/micro-aulas/personalizacao ───────────────────────────
// Tipo 3: Personalização Massiva — 5 versões de 1 plano de aula
router.post("/notebook/plano-aula-versoes", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, duracao = 50, nivel = "Ensino Médio" } = req.body as { docId: number; duracao?: number; nivel?: string };
  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: OR.fast,
      temperature: 0.6,
      max_tokens: 5500,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em diferenciação pedagógica — o mesmo conteúdo, adaptado para 5 realidades diferentes de turma.
Gere 5 versões do plano de aula, cada uma para um perfil diferente, mantendo os mesmos objetivos de aprendizagem.

Retorne APENAS JSON válido:
{
  "tema": "Tema do conteúdo",
  "nivel": "${nivel}",
  "duracao": "${duracao} minutos",
  "objetivoCentral": "Objetivo de aprendizagem que todas as versões compartilham",
  "versoes": {
    "turmaDificil": {
      "diagnostico": "Por que estão desengajados — histórico, desconexão, problemas externos",
      "estrategiasEngajamento": [
        {"estrategia": "Gamificação", "aplicacao": "Como aplicar especificamente nesta aula"},
        {"estrategia": "Relevância imediata", "aplicacao": "Conexão com problema deles AGORA"},
        {"estrategia": "Sucesso rápido", "aplicacao": "Vitória garantida nos primeiros 5 min"},
        {"estrategia": "Escolha autêntica", "aplicacao": "Opções reais de caminho na aula"}
      ],
      "adaptacoes": ["Mudança 1: mais movimento, menos sentado", "Mudança 2", "Mudança 3"],
      "abertura": "Como começar esta aula com esta turma — gancho específico",
      "linguagem": "Tom e vocabulário para esta turma"
    },
    "turmaAvancada": {
      "diagnostico": "Alunos que já sabem — precisam de profundidade e autonomia",
      "estrategiasEnriquecimento": [
        {"estrategia": "Autonomia", "aplicacao": "Como aplicar"},
        {"estrategia": "Complexidade", "aplicacao": "Conexões interdisciplinares"},
        {"estrategia": "Liderança", "aplicacao": "Alunos ensinam alunos"}
      ],
      "adaptacoes": ["Mudança 1: conteúdo extra opcional", "Mudança 2", "Mudança 3"],
      "abertura": "Como começar com este perfil",
      "produtoFinal": "Avaliação por portfólio ou produto aberto"
    },
    "turmaInclusiva": {
      "perfilEspecifico": "Quais necessidades: TEA, TDAH, deficiência auditiva/visual/motora",
      "adaptacoesPorNecessidade": [
        {"necessidade": "TDAH", "adaptacao": "Movimento, quebra de atividade, feedback constante"},
        {"necessidade": "TEA", "adaptacao": "Rotina visual, aviso de transições, redução de estímulo"},
        {"necessidade": "Deficiência auditiva", "adaptacao": "Material visual, legendas, linguagem gestual"},
        {"necessidade": "Altas habilidades", "adaptacao": "Enriquecimento dentro da inclusão"}
      ],
      "recursosAcessiveis": ["Lista de materiais acessíveis necessários"],
      "avaliacaoAdaptada": "Como avaliar com as mesmas competências, de forma justa"
    },
    "aulaRemota": {
      "modalidade": "Síncrona ao vivo | Gravada | Híbrida flexível",
      "adaptacoesEngajamento": [
        {"desafio": "Atenção dispersa", "solucao": "Micro-atividades a cada 5 min"},
        {"desafio": "Isolamento", "solucao": "Breakout rooms, fóruns colaborativos"},
        {"desafio": "Fadiga de tela", "solucao": "Momentos câmera desligada, movimento"}
      ],
      "estruturaVideo": [
        {"timestamp": "0:00-0:30", "conteudo": "Gancho", "recursoVisual": "Descrição"},
        {"timestamp": "0:30-5:00", "conteudo": "Conteúdo principal", "recursoVisual": "Descrição"}
      ],
      "interacoesObrigatorias": ["Chat, quiz, entrega, fórum — o que o aluno precisa fazer"]
    },
    "aulaHibrida": {
      "organizacao": [
        {"estacao": "Estação 1 — com professor", "atividade": "Explicação e prática guiada", "grupo": "Grupo A", "tempo": "0-20 min"},
        {"estacao": "Estação 2 — independente", "atividade": "Atividade digital autônoma", "grupo": "Grupo B", "tempo": "0-20 min"},
        {"estacao": "Troca", "atividade": "Grupos trocam", "grupo": "Todos", "tempo": "20 min"},
        {"estacao": "Síntese", "atividade": "Todos juntos", "grupo": "Todos", "tempo": "40-50 min"}
      ],
      "atividadeOnline": "O que fazem quando não estão com o professor",
      "sincronizacao": "Como garante que ambos os grupos aprenderam o essencial"
    }
  }
}`,
        },
        { role: "user", content: `Tema: "${row.title}"\nNível: ${nivel}\nDuração: ${duracao} min\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook plano-aula-versoes:", e);
    res.status(500).json({ erro: "Erro ao gerar versões do plano" });
  }
});

// ─── POST /api/notebook/dna ───────────────────────────────────────────────────
// DNA das Fontes: análise profunda IA do conteúdo do documento
router.post("/notebook/dna", async (req: Request, res: Response) => {
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
      model: OR.fast,
      temperature: 0.2,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em análise de conteúdo educacional. Faça o "DNA" completo deste documento.
Retorne APENAS JSON válido:
{
  "temaPrincipal": "1 frase descrevendo o núcleo do documento",
  "subtemas": ["subtema 1", "subtema 2", "subtema 3"],
  "tipoFonte": "artigo_cientifico | livro | aula_gravada | pdf_academico | noticia | apostila | outro",
  "dominio": "biologia | historia | literatura | matematica | quimica | fisica | geografia | filosofia | sociologia | lingua_portuguesa | interdisciplinar",
  "nivelComplexidade": "basico | intermediario | avancado",
  "extensao": "curto | medio | longo",
  "conceitosChave": [
    { "termo": "conceito", "importancia": 0.0, "definicao": "definição concisa", "relacoes": ["outro conceito relacionado"] }
  ],
  "pessoasImportantes": ["pessoa 1 e seu papel", "pessoa 2"],
  "datasImportantes": ["data e evento", "data e evento"],
  "tomOriginal": "formal_academico | divulgativo | tecnico | narrativo",
  "prerequisitosSugeridos": ["O que o aluno precisa saber antes"],
  "lacunas": ["Tópico não coberto que seria relevante"],
  "sugestoesFontes": ["Fonte complementar sugerida 1", "Fonte sugerida 2"],
  "relevanciaEnem": "Alta | Média | Baixa",
  "competenciasEnem": ["Competência/área ENEM contemplada"],
  "aplicacoesPraticas": ["Aplicação do conteúdo na vida real"],
  "controversias": ["Debate ou polêmica relacionada ao tema"]
}
Gere 5-8 conceitos-chave com importância de 0.0 a 1.0.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook dna:", e);
    res.status(500).json({ erro: "Erro ao analisar DNA das fontes" });
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

    const aulaSystemPrompt = `Você é o Professor Tiagão — um professor APAIXONADO, CARISMÁTICO e expert em ENEM/vestibulares. Você explica como um professor incrível que faz os alunos amarem a matéria. Sua narração é oral, dinâmica e cheia de energia.

Crie uma AULA COMPLETA e RICA na lousa. Retorne APENAS JSON válido:
{
  "titulo": "Título instigante da aula (não genérico)",
  "subtitulo": "Área do conhecimento ENEM | Nível de dificuldade",
  "etapas": [
    {
      "id": 1,
      "narracao": "8-12 frases faladas como um professor de verdade. Tom animado, use pausas dramáticas com '...' Inclua: (1) gancho de abertura surpreendente, (2) analogia com o cotidiano do aluno brasileiro, (3) explicação clara do conceito, (4) por que isso cai no ENEM. NUNCA diga 'como descrito no documento'. Fale diretamente sobre o conceito.",
      "elementos": [
        {"tipo": "titulo", "texto": "TÍTULO EM MAIÚSCULAS (max 6 palavras)"},
        {"tipo": "texto", "texto": "Explicação completa em 2-3 linhas com dados reais e contexto"},
        {"tipo": "separador"},
        {"tipo": "destaque", "texto": "CONCEITO-CHAVE: definição clara e memorável"},
        {"tipo": "exemplo", "texto": "Exemplo concreto e específico do Brasil / ENEM com detalhes"},
        {"tipo": "seta", "texto": "Ponto crucial para o ENEM: como identificar na prova"},
        {"tipo": "formula", "texto": "Fórmula ou regra mnemônica para lembrar (quando aplicável)"}
      ],
      "duracao": 45
    }
  ]
}

REGRAS OBRIGATÓRIAS:
- Gere 6-8 etapas cobrindo o conteúdo do BÁSICO ao AVANÇADO progressivamente
- Cada narração: MÍNIMO 8 frases completas e entusiasmadas (fale como professor de verdade em sala!)
- Use TODOS os tipos de elemento em cada etapa: titulo, texto, separador, destaque, exemplo, seta
- Use "formula" para definições, regras ou mnemonicos importantes
- Dados reais do documento: datas, números, nomes — cite tudo específico
- A primeira etapa DEVE ter um gancho emocionante que prenda a atenção
- Última etapa: síntese + conexão com o ENEM + dica de como estudar mais
- Narração em PT-BR brasileiro informal e energético — como um youtuber educativo apaixonado`;

    // Gemini 2.5 Flash — NotebookLM-style com contexto completo do documento
    const rawAula = await generateWithGemini(
      aulaSystemPrompt,
      `Documento: "${row.title}"\n\n${row.content_text.slice(0, 60_000)}`,
      7000,
    );
    const clean = rawAula.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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
      model: OR.fast,
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
      model: OR.fast,
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

    // Gemini 2.5 Flash — NotebookLM-style: lê o documento completo (até 80K chars)
    const slidesSystemPrompt = `Você é o Professor Tiagão criando uma APRESENTAÇÃO PROFISSIONAL em slides sobre o documento.
Pense como o NotebookLM: conteúdo 100% fiel às fontes, títulos magnéticos, hierarquia visual clara, variedade de tipos de slide.
Retorne APENAS JSON válido:
{
  "titulo": "Título magnético da apresentação (≤ 8 palavras)",
  "subtitulo": "Subtítulo de uma linha",
  "autor": "Professor Tiagão",
  "tema": "indigo" | "rose" | "emerald" | "amber",
  "slides": [
    { "tipo": "capa", "titulo": "string", "subtitulo": "string", "icone": "BookOpen" },
    { "tipo": "agenda", "titulo": "Roteiro", "itens": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5"] },
    { "tipo": "conteudo", "titulo": "string (≤ 6 palavras)", "subtitulo": "contexto em 1 frase", "bullets": ["dado específico do documento", "outro dado com número/nome/data", "conceito-chave explicado", "aplicação prática"], "destaque": "INSIGHT: frase de impacto com dado do documento" },
    { "tipo": "destaque_numerico", "titulo": "string", "numeros": [{"valor": "220,94%", "label": "Sobre o FOB"}, {"valor": "USD 8.986", "label": "Custo total"}] },
    { "tipo": "comparacao", "titulo": "string", "esquerda": {"titulo": "string", "itens": ["..."]}, "direita": {"titulo": "string", "itens": ["..."]} },
    { "tipo": "citacao", "texto": "citação direta do material", "autor": "string opcional" },
    { "tipo": "timeline", "titulo": "string", "etapas": [{"numero": "01", "titulo": "Etapa", "descricao": "descrição curta"}] },
    { "tipo": "encerramento", "titulo": "Conclusão", "mensagem": "frase final impactante baseada nos dados", "dicaEnem": "como esse tema cai no ENEM" }
  ]
}
REGRAS:
- Gere 10-14 slides total: capa → agenda → desenvolvimento rico → conclusão
- Bullets: dados ESPECÍFICOS do documento (nomes, valores, datas, percentuais REAIS)
- Varie os tipos: mínimo 3 tipos diferentes além de capa/agenda/encerramento
- Use tipo "destaque_numerico" quando há dados quantitativos relevantes
- Use tipo "comparacao" quando há dois lados/categorias para comparar
- Tema: escolha baseado no assunto (emerald=natureza/saúde, indigo=tecnologia/finanças, rose=humanas/arte, amber=história/geo)`;

    const slidesRaw = await generateWithGemini(
      slidesSystemPrompt,
      `Documento: "${row.title}"\n\n${row.content_text.slice(0, 80_000)}`,
      5000,
    );

    const clean = slidesRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let apresentacao: any;
    try { apresentacao = JSON.parse(clean); }
    catch { apresentacao = JSON.parse(clean.slice(0, clean.lastIndexOf('}') + 1) || "{}"); }

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

// ─── GET /api/notebook/tiagao-artifacts ──────────────────────────────────────
// Lista todos os artefatos criados pelo Tiagão (doc_id = 0) para o usuário atual
router.get("/notebook/tiagao-artifacts", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    await ensureNotebooksSchema();
    const rows = await db.execute(sql`
      SELECT id, kind, title, created_at
        FROM notebook_artifacts
       WHERE user_id = ${req.userId} AND doc_id = 0
       ORDER BY created_at DESC
       LIMIT 100
    `);
    res.json({ artifacts: rows.rows });
  } catch (e) {
    console.error("tiagao artifacts list:", e);
    res.status(500).json({ erro: "Erro ao listar artefatos do Tiagão" });
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
      model: OR.fast, temperature: 0.7, max_tokens: 350,
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
    // Gemini 2.5 Flash — NotebookLM-style com contexto completo das fontes
    const tabelaRaw = await generateWithGemini(
      'Analise as fontes e crie uma tabela comparativa dos conceitos/dados principais. Retorne APENAS JSON: {"titulo":"string","colunas":["col1","col2",...],"linhas":[["val1","val2",...],...],"notas":"string opcional"}. Mínimo 3 colunas e 8 linhas. Preencha cada célula com dados ricos e específicos do material.',
      `Fontes:\n${context}`,
      3000,
    );
    const tabelaMatch = tabelaRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim().match(/\{[\s\S]*\}/);
    const tabela = tabelaMatch ? JSON.parse(tabelaMatch[0]) : { titulo: "Tabela", colunas: [], linhas: [] };
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
    // Gemini 2.5 Flash — NotebookLM-style com contexto completo das fontes
    const relatorioConteudo = await generateWithGemini(
      `Você é especialista sênior em produção de conteúdo educacional. Escreva um ${templates[template] ?? templates.academico} com base nas fontes. Use Markdown formatado, com seções bem estruturadas, dados específicos citados das fontes, exemplos práticos e análises aprofundadas. Mínimo 600 palavras. Cite fontes com [Fonte N] quando relevante.`,
      `Fontes:\n${context}`,
      5000,
    );
    res.json({ conteudo: relatorioConteudo, template });
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
        model: OR.fast, max_tokens: 700,
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
      model: OR.fast, max_tokens: 700,
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
