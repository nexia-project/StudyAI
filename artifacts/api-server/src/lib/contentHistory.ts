import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export type ContentKind =
  | "resumao"
  | "slides"
  | "mapa_mental"
  | "infografico"
  | "material_premium"
  | "lesson_plan"
  | "exam"
  | "research"
  | "content_package";

export type OwnerRole = "student" | "teacher";

export interface SaveContentInput {
  ownerId: string;
  ownerRole: OwnerRole;
  kind: ContentKind;
  title: string;
  materia?: string | null;
  payload?: any;
  htmlUrl?: string | null;
}

export interface ContentRow {
  id: number;
  owner_id: string;
  owner_role: OwnerRole;
  kind: ContentKind;
  title: string;
  materia: string | null;
  payload: any;
  html_url: string | null;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Salva um conteúdo gerado no histórico universal. Nunca lança — apenas loga.
 * Retorna o ID do registro ou null em caso de falha.
 */
export async function saveGeneratedContent(input: SaveContentInput): Promise<number | null> {
  try {
    if (!input.ownerId || !input.kind) return null;
    const title = (input.title || "Sem título").slice(0, 500);
    const materia = input.materia ? input.materia.slice(0, 120) : null;
    const payload = input.payload ?? {};
    const htmlUrl = input.htmlUrl ?? null;

    const r = await db.execute<{ id: number }>(sql`
      INSERT INTO generated_content (owner_id, owner_role, kind, title, materia, payload, html_url)
      VALUES (${input.ownerId}, ${input.ownerRole}, ${input.kind}, ${title}, ${materia}, ${JSON.stringify(payload)}::jsonb, ${htmlUrl})
      RETURNING id
    `);
    const id = r.rows[0]?.id ?? null;
    return id;
  } catch (err) {
    logger.warn({ err, kind: input.kind }, "[contentHistory] save failed (non-fatal)");
    return null;
  }
}

export interface ListContentOpts {
  ownerId: string;
  ownerRole?: OwnerRole; // se não informado, lista todos os papéis do owner
  kind?: ContentKind | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listContent(opts: ListContentOpts): Promise<{ items: ContentRow[]; total: number }> {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const search = opts.search?.trim() ? `%${opts.search.trim()}%` : null;
  const kindFilter = opts.kind ?? null;
  const roleFilter = opts.ownerRole ?? null;

  // payload pode conter base64 pesado (infográficos) ou HTML grande (material premium).
  // No list, retornamos apenas um "summary" leve; o detalhe vem via getContent.
  const items = await db.execute<ContentRow>(sql`
    SELECT id, owner_id, owner_role, kind, title, materia,
           jsonb_build_object(
             'titulo', payload->'titulo',
             'subtitulo', payload->'subtitulo',
             'topico', payload->'topico',
             'nivel', payload->'nivel',
             'preview', LEFT(COALESCE(payload->>'resumo', payload->>'visaoGeral', ''), 240)
           ) AS payload,
           html_url, created_at
    FROM generated_content
    WHERE owner_id = ${opts.ownerId}
      AND deleted_at IS NULL
      AND (${roleFilter}::text IS NULL OR owner_role = ${roleFilter})
      AND (${kindFilter}::text IS NULL OR kind = ${kindFilter})
      AND (${search}::text IS NULL OR title ILIKE ${search} OR materia ILIKE ${search})
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const totalRes = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::int AS count
    FROM generated_content
    WHERE owner_id = ${opts.ownerId}
      AND deleted_at IS NULL
      AND (${roleFilter}::text IS NULL OR owner_role = ${roleFilter})
      AND (${kindFilter}::text IS NULL OR kind = ${kindFilter})
      AND (${search}::text IS NULL OR title ILIKE ${search} OR materia ILIKE ${search})
  `);

  return {
    items: items.rows as ContentRow[],
    total: Number(totalRes.rows[0]?.count ?? 0),
  };
}

export async function getContent(ownerId: string, id: number): Promise<ContentRow | null> {
  const r = await db.execute<ContentRow>(sql`
    SELECT id, owner_id, owner_role, kind, title, materia, payload, html_url, created_at
    FROM generated_content
    WHERE id = ${id} AND owner_id = ${ownerId} AND deleted_at IS NULL
    LIMIT 1
  `);
  return (r.rows[0] as ContentRow) ?? null;
}

export async function softDeleteContent(ownerId: string, id: number): Promise<boolean> {
  const r = await db.execute(sql`
    UPDATE generated_content
    SET deleted_at = NOW()
    WHERE id = ${id} AND owner_id = ${ownerId} AND deleted_at IS NULL
  `);
  return (r.rowCount ?? 0) > 0;
}
