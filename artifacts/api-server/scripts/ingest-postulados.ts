/**
 * scripts/ingest-postulados.ts — ingestão em lote de materiais POSTULADOS / professor.
 *
 * Lê arquivos .pdf, .docx, .txt e .md de uma pasta (recursivo) e grava em
 * `knowledge_documents`, com metadados `{ source: 'postulado', materia, autor }`.
 *
 * Pré-requisitos:
 *   - DATABASE_URL apontando para o Postgres do ambiente
 *   - Usuário admin existente em `users` (id interno, não clerk_id)
 *
 * Uso (na raiz do monorepo StudyAI):
 *   pnpm --filter @workspace/api-server run ingest:postulados -- "C:\caminho\postulados"
 *   pnpm --filter @workspace/api-server run ingest:postulados -- "./exports/postulados" --uploaded-by=UUID_ADMIN --materia=Matemática --autor="Prof. Silva"
 *   pnpm --filter @workspace/api-server run ingest:postulados -- "./pasta" --uploaded-by=UUID --dry-run
 *   pnpm --filter @workspace/api-server run ingest:postulados -- "./pasta" --uploaded-by=UUID --skip-existing
 *
 * Flags:
 *   --uploaded-by=ID   (obrigatório) dono do documento na base global
 *   --materia=TEXT     matéria padrão quando o nome do arquivo não indicar
 *   --autor=TEXT       autor padrão (ex.: professor ou banca)
 *   --dry-run          só lista arquivos e tamanho do texto extraído, sem INSERT
 *   --skip-existing    pula se já existir doc com mesmo source_file + uploaded_by
 *
 * Heurística de metadados pelo nome do arquivo:
 *   `Materia_Autor_Titulo.pdf` → materia, autor, título
 */

import { createRequire } from "node:module";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const _require = createRequire(import.meta.url);

const SUPPORTED_EXT = new Set([".pdf", ".docx", ".txt", ".md"]);
const MIN_TEXT_LEN = 80;
const CHUNK_SIZE = 4000;
const CHUNK_OVERLAP = 400;

interface CliArgs {
  folder: string;
  uploadedBy: string;
  materiaDefault: string | null;
  autorDefault: string | null;
  dryRun: boolean;
  skipExisting: boolean;
}

interface ParsedMeta {
  title: string;
  materia: string | null;
  autor: string | null;
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const a of argv.slice(2)) {
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq === -1) flags[a.slice(2)] = true;
      else flags[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      positional.push(a);
    }
  }

  const folder = positional[0];
  if (!folder) {
    console.error(
      "Uso: ingest:postulados <pasta> --uploaded-by=<user_id> [--materia=] [--autor=] [--dry-run] [--skip-existing]",
    );
    process.exit(1);
  }

  const uploadedBy = typeof flags["uploaded-by"] === "string" ? flags["uploaded-by"] : "";
  if (!uploadedBy) {
    console.error("Erro: --uploaded-by é obrigatório (id do usuário admin em users.id).");
    process.exit(1);
  }

  return {
    folder: path.resolve(folder),
    uploadedBy,
    materiaDefault: typeof flags.materia === "string" ? flags.materia : null,
    autorDefault: typeof flags.autor === "string" ? flags.autor : null,
    dryRun: flags["dry-run"] === true,
    skipExisting: flags["skip-existing"] === true,
  };
}

function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function parseSimpleFrontmatter(text: string): Record<string, string | boolean> {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const metadata: Record<string, string | boolean> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const parsed = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
    if (!parsed) continue;

    const key = parsed[1];
    const rawValue = parsed[2].trim().replace(/^["']|["']$/g, "");
    if (rawValue === "true") metadata[key] = true;
    else if (rawValue === "false") metadata[key] = false;
    else metadata[key] = rawValue;
  }
  return metadata;
}

function parseMetaFromFilename(filePath: string, defaults: { materia: string | null; autor: string | null }): ParsedMeta {
  const base = path.basename(filePath, path.extname(filePath));
  const title = base.replace(/_/g, " ").replace(/-/g, " ").trim();
  const underscoreParts = base.split(/_+/).map((p) => p.trim()).filter(Boolean);
  if (underscoreParts.length >= 3) {
    return {
      materia: underscoreParts[0] ?? defaults.materia,
      autor: underscoreParts[1] ?? defaults.autor,
      title: underscoreParts.slice(2).join(" "),
    };
  }

  const parts = base.split(/[_-]+/).map((p) => p.trim()).filter(Boolean);

  let materia = defaults.materia;
  let autor = defaults.autor;
  if (parts.length >= 3) {
    materia = parts[0] ?? materia;
    autor = parts[1] ?? autor;
    return { title: parts.slice(2).join(" "), materia, autor };
  }
  if (parts.length === 2) {
    materia = parts[0] ?? materia;
    return { title: parts[1] ?? title, materia, autor: defaults.autor };
  }
  return { title, materia, autor };
}

async function extractFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const lower = ext.toLowerCase();

  if (lower === ".txt" || lower === ".md") {
    return sanitizeText(buffer.toString("utf8"));
  }

  if (lower === ".docx") {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer });
    return sanitizeText(r.value);
  }

  if (lower === ".pdf") {
    try {
      const pdfParser = _require("pdf-parse/lib/pdf-parse");
      const parsed = await pdfParser(buffer);
      const text = sanitizeText(parsed.text ?? "");
      if (text.length >= MIN_TEXT_LEN) return text;
    } catch {
      /* fallback abaixo */
    }
    return sanitizeText(
      buffer
        .toString("latin1")
        .replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ")
        .replace(/\s{3,}/g, "\n"),
    );
  }

  return "";
}

async function collectFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectFiles(full)));
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (SUPPORTED_EXT.has(ext)) out.push(full);
  }
  return out.sort();
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

async function ensureKnowledgeDocColumns(): Promise<void> {
  const alters = [
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS subject VARCHAR(255)`,
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS tags TEXT[]`,
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS parent_doc_id INTEGER`,
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS is_chunk BOOLEAN DEFAULT false`,
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0`,
    `ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS page_count INTEGER`,
  ];
  for (const stmt of alters) {
    await db.execute(sql.raw(stmt)).catch(() => {});
  }
}

async function docExists(uploadedBy: string, sourceFile: string): Promise<boolean> {
  const res = await db.execute(sql`
    SELECT id FROM knowledge_documents
    WHERE uploaded_by = ${uploadedBy}
      AND source_file = ${sourceFile}
      AND (is_chunk = false OR is_chunk IS NULL)
    LIMIT 1
  `);
  return res.rows.length > 0;
}

async function insertDocument(params: {
  title: string;
  subject: string | null;
  contentText: string;
  uploadedBy: string;
  sourceFile: string;
  fileSizeKb: number;
  metadata: Record<string, unknown>;
  tags: string[];
}): Promise<{ parentId: number; chunks: number }> {
  const { title, subject, contentText, uploadedBy, sourceFile, fileSizeKb, metadata, tags } = params;

  const parentResult = await db.execute(sql`
    INSERT INTO knowledge_documents (
      title, subject, content_text, uploaded_by,
      source_file, file_size_kb, tags, metadata, is_chunk, chunk_index
    )
    VALUES (
      ${title}, ${subject}, ${contentText}, ${uploadedBy},
      ${sourceFile}, ${fileSizeKb}, ${tags}, ${JSON.stringify(metadata)}::jsonb,
      false, 0
    )
    RETURNING id
  `);
  const parentId = (parentResult.rows[0] as { id: number }).id;

  const chunks = chunkText(contentText);
  let savedChunks = 0;
  if (chunks.length > 1) {
    for (let i = 0; i < chunks.length; i++) {
      await db.execute(sql`
        INSERT INTO knowledge_documents (
          title, subject, content_text, uploaded_by,
          source_file, parent_doc_id, is_chunk, chunk_index, language, metadata, tags
        )
        VALUES (
          ${`${title} [parte ${i + 1}/${chunks.length}]`},
          ${subject},
          ${chunks[i]},
          ${uploadedBy},
          ${sourceFile},
          ${parentId},
          true,
          ${i + 1},
          'pt',
          ${JSON.stringify(metadata)}::jsonb,
          ${tags}
        )
      `);
      savedChunks += 1;
    }
  }

  return { parentId, chunks: savedChunks };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!process.env.DATABASE_URL) {
    console.error("Erro: defina DATABASE_URL antes de rodar o ingest.");
    process.exit(1);
  }

  const folderStat = await stat(args.folder).catch(() => null);
  if (!folderStat?.isDirectory()) {
    console.error(`Erro: pasta não encontrada: ${args.folder}`);
    process.exit(1);
  }

  await ensureKnowledgeDocColumns();

  const userCheck = await db.execute(sql`SELECT id FROM users WHERE id = ${args.uploadedBy} LIMIT 1`);
  if (userCheck.rows.length === 0) {
    console.warn(
      `[ingest-postulados] aviso: usuário ${args.uploadedBy} não encontrado em users — INSERT pode falhar por FK.`,
    );
  }

  const files = await collectFiles(args.folder);
  console.log(`[ingest-postulados] pasta: ${args.folder}`);
  console.log(`[ingest-postulados] arquivos suportados: ${files.length}`);
  console.log(`[ingest-postulados] uploaded_by: ${args.uploadedBy}`);
  if (args.dryRun) console.log("[ingest-postulados] modo dry-run — nenhum INSERT");

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const rel = path.relative(args.folder, filePath);
    const ext = path.extname(filePath).toLowerCase();
    const meta = parseMetaFromFilename(filePath, {
      materia: args.materiaDefault,
      autor: args.autorDefault,
    });
    const sourceFile = `postulado:${rel.replace(/\\/g, "/")}`;

    if (args.skipExisting && (await docExists(args.uploadedBy, sourceFile))) {
      skipped += 1;
      console.log(`  ⊘ já existe: ${rel}`);
      continue;
    }

    try {
      const buf = await readFile(filePath);
      const text = await extractFromBuffer(buf, ext);
      if (text.length < MIN_TEXT_LEN) {
        skipped += 1;
        console.warn(`  ⊘ texto curto (${text.length} chars): ${rel}`);
        continue;
      }

      const metadata = {
        ...parseSimpleFrontmatter(text),
        source: "postulado",
        materia: meta.materia,
        autor: meta.autor,
        path: rel,
      };
      const tags = ["postulado", ...(meta.materia ? [meta.materia] : [])];

      if (args.dryRun) {
        console.log(
          `  ✓ [dry-run] ${rel} — ${text.length} chars | matéria=${meta.materia ?? "-"} | autor=${meta.autor ?? "-"}`,
        );
        inserted += 1;
        continue;
      }

      const fileSizeKb = Math.ceil(buf.length / 1024);
      const result = await insertDocument({
        title: meta.title,
        subject: meta.materia,
        contentText: text.slice(0, 500_000),
        uploadedBy: args.uploadedBy,
        sourceFile,
        fileSizeKb,
        metadata,
        tags,
      });
      inserted += 1;
      console.log(`  ✓ ${rel} → doc #${result.parentId} (+${result.chunks} chunks)`);
    } catch (err) {
      failed += 1;
      console.warn(`  ✗ ${rel}: ${(err as Error).message}`);
    }
  }

  console.log("\n[ingest-postulados] ── resumo ──");
  console.log(`  inseridos/dry-run: ${inserted}`);
  console.log(`  ignorados:         ${skipped}`);
  console.log(`  falhas:            ${failed}`);
}

void main().catch((err) => {
  console.error("[ingest-postulados] erro fatal:", err);
  process.exit(1);
});
