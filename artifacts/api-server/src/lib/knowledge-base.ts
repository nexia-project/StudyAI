/**
 * knowledge-base.ts
 * Base de conhecimento auto-alimentada (FTS — sem pgvector).
 * Indexa tudo que o Tiagão gera/explica e permite busca contextual
 * para evitar repetição e referenciar estudos anteriores.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface KnowledgeEntry {
  id: number;
  userId: string;
  type: string;
  title: string | null;
  content: string;
  source: string;
  subject: string | null;
  topics: string[];
  qualityScore: number;
  accessCount: number;
  createdAt: string;
}

// ─── Salvar conhecimento ───────────────────────────────────────────────────────
export async function storeKnowledge(params: {
  userId: string;
  type: "material" | "conversation" | "note" | "exercise" | "summary" | "question" | "explanation";
  title?: string;
  content: string;
  source: "tiagao" | "notebook" | "manual" | "study" | "upload";
  subject?: string;
  topics?: string[];
  metadata?: Record<string, any>;
  qualityScore?: number;
}): Promise<void> {
  try {
    if ((params.content?.length ?? 0) < 80) return; // conteúdo muito curto é inútil
    const { userId, type, title, content, source, subject, topics, qualityScore } = params;
    const snippet = content.slice(0, 60);
    // Evitar duplicatas recentes (mesmos 60 chars + mesmo tipo + mesmo userId nos últimos 7 dias)
    const dup = await db.execute(sql`
      SELECT id FROM knowledge_base
      WHERE user_id = ${userId} AND type = ${type}
        AND content ILIKE ${'%' + snippet + '%'}
        AND created_at > NOW() - INTERVAL '7 days'
      LIMIT 1
    `);
    if (dup.rows.length > 0) return;
    await db.execute(sql`
      INSERT INTO knowledge_base
        (user_id, type, title, content, source, subject, topics, quality_score)
      VALUES
        (${userId}, ${type}, ${title ?? null}, ${content}, ${source},
         ${subject ?? null}, ${topics ?? []}, ${qualityScore ?? 0.5})
    `);
  } catch { /* non-critical */ }
}

// ─── Busca FTS + ILIKE fallback ───────────────────────────────────────────────
export async function searchKnowledge(
  userId: string,
  query: string,
  opts: { limit?: number; type?: string; subject?: string } = {},
): Promise<KnowledgeEntry[]> {
  const { limit = 5, type, subject } = opts;
  if (!query?.trim()) return [];

  try {
    const stopWords = new Set(["o","a","os","as","um","uma","de","da","do","e","que","em","para","com","por","se","me","te","nos","isso","este","essa","qual","quando","onde","não","sim","mais","mas","ou","é","foi","ser","ter","ao","já"]);
    const keywords = query.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 6);

    if (!keywords.length) return [];

    const ftsQuery = keywords.join(" | ");
    let rows: any[] = [];

    try {
      const res = await db.execute(sql`
        SELECT id, user_id, type, title, content, source, subject, topics,
               quality_score, access_count, created_at,
               ts_rank(to_tsvector('portuguese', COALESCE(title,'') || ' ' || content),
                       to_tsquery('portuguese', ${ftsQuery})) AS score
        FROM knowledge_base
        WHERE user_id = ${userId}
          AND to_tsvector('portuguese', COALESCE(title,'') || ' ' || content)
              @@ to_tsquery('portuguese', ${ftsQuery})
          ${type ? sql`AND type = ${type}` : sql``}
          ${subject ? sql`AND subject ILIKE ${'%' + subject + '%'}` : sql``}
        ORDER BY score DESC, quality_score DESC, created_at DESC
        LIMIT ${limit}
      `);
      rows = res.rows as any[];
    } catch { /* FTS failed */ }

    // Fallback ILIKE se FTS não retornou nada
    if (rows.length === 0 && keywords[0]) {
      try {
        const res = await db.execute(sql`
          SELECT id, user_id, type, title, content, source, subject, topics,
                 quality_score, access_count, created_at
          FROM knowledge_base
          WHERE user_id = ${userId}
            AND (content ILIKE ${'%' + keywords[0] + '%'} OR title ILIKE ${'%' + keywords[0] + '%'})
            ${type ? sql`AND type = ${type}` : sql``}
          ORDER BY quality_score DESC, created_at DESC
          LIMIT ${limit}
        `);
        rows = res.rows as any[];
      } catch { /* ignore */ }
    }

    if (rows.length === 0) return [];

    // Atualiza access_count
    const ids = rows.map((r: any) => r.id);
    db.execute(sql`
      UPDATE knowledge_base SET access_count = access_count + 1, last_accessed_at = NOW()
      WHERE id = ANY(${ids}::int[])
    `).catch(() => {});

    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title ?? null,
      content: r.content,
      source: r.source,
      subject: r.subject ?? null,
      topics: r.topics ?? [],
      qualityScore: Number(r.quality_score ?? 0.5),
      accessCount: Number(r.access_count ?? 0),
      createdAt: r.created_at,
    }));
  } catch { return []; }
}

// ─── Contexto para geração (injeta estudos anteriores no prompt) ──────────────
export async function getContextForGeneration(
  userId: string,
  topic: string,
  subject?: string,
): Promise<string> {
  const results = await searchKnowledge(userId, topic, { limit: 4, subject });
  if (results.length === 0) return "";

  const ctx = results
    .map(r => `[${r.type}${r.subject ? ` — ${r.subject}` : ""}]: ${r.content.slice(0, 400)}`)
    .join("\n\n");

  return `\n\n─── HISTÓRICO DE ESTUDOS DESTE ALUNO (use como referência) ───\n${ctx}\n─── FIM DO HISTÓRICO ───\nReferencie estudos anteriores naturalmente ("Como vimos antes...", "Você já estudou..."). NÃO repita — expanda e aprofunde.`;
}
