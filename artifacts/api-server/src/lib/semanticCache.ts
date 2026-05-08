/**
 * StudyAI — Cache Semântico Multi-Nível
 *
 * Implementa 3 níveis de cache usando PostgreSQL + pgvector:
 *
 *   NÍVEL 1 — EXATO   : Hash SHA-256 → hit imediato  (<5ms)
 *   NÍVEL 2 — SEMÂNTICO: Cosine sim > 0.92 → hit validado (<50ms)
 *   NÍVEL 3 — APROXIMADO: Cosine sim 0.82–0.92 → hit com nota de caveat (< 80ms)
 *   MISS    — IA EXTERNA: OpenAI/Claude → response salva no cache
 *
 * Redução esperada de custo: ~55-60% em queries repetidas ou similares.
 */

import crypto from "crypto";
import OpenAI from "openai";
import { pool } from "@workspace/db";

// ─── Thresholds de similaridade cosseno ───────────────────────────────────────
const THRESHOLD_SEMANTICO  = 0.92;   // Nível 2: resposta direta
const THRESHOLD_APROXIMADO = 0.82;   // Nível 3: resposta com caveat

// ─── Cliente OpenAI para embeddings (text-embedding-3-small = $0.02/M tokens) ─
// Usa api.openai.com diretamente — AI_INTEGRATIONS_OPENAI_BASE_URL não suporta /embeddings
const embedder = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: "https://api.openai.com/v1",
});

// ─── Usa o pool compartilhado de @workspace/db ───────────────────────────────
function getPool() {
  return pool;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type CacheHitLevel = "exact" | "semantic" | "approximate" | "miss";

export type CacheResult = {
  hit: true;
  level: Exclude<CacheHitLevel, "miss">;
  response: string;
  similarity?: number;
  fromCacheId: number;
} | {
  hit: false;
  level: "miss";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\sáéíóúâêîôûãõç]/gi, "");
}

export function hashQuery(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await embedder.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 2000), // max input length guard
  });
  return res.data[0].embedding;
}

function vectorToPostgres(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Busca resposta no cache de 3 níveis.
 * Retorna CacheResult — se `hit: true`, use `response` diretamente.
 */
export async function cacheGet(
  feature: string,
  query: string
): Promise<CacheResult> {
  const db = getPool();
  const normalized = normalizeQuery(query);
  const hash = hashQuery(normalized);

  try {
    // ── NÍVEL 1: Hash exato ──────────────────────────────────────────────────
    const exactRow = await db.query<{ id: number; response: string }>(
      `SELECT id, response FROM ai_response_cache
       WHERE feature = $1 AND query_hash = $2
       LIMIT 1`,
      [feature, hash]
    );

    if (exactRow.rows.length > 0) {
      const row = exactRow.rows[0];
      await db.query(
        `UPDATE ai_response_cache
         SET uso_count = uso_count + 1, last_accessed = NOW()
         WHERE id = $1`,
        [row.id]
      );
      return { hit: true, level: "exact", response: row.response, fromCacheId: row.id };
    }

    // ── NÍVEL 2 e 3: Similaridade vetorial ──────────────────────────────────
    const embedding = await getEmbedding(normalized);
    const vecStr = vectorToPostgres(embedding);

    const semanticRows = await db.query<{
      id: number;
      response: string;
      similarity: number;
    }>(
      `SELECT id, response,
              1 - (query_embedding <=> $1::vector) AS similarity
       FROM ai_response_cache
       WHERE feature = $2
         AND query_embedding IS NOT NULL
         AND 1 - (query_embedding <=> $1::vector) >= $3
       ORDER BY similarity DESC
       LIMIT 3`,
      [vecStr, feature, THRESHOLD_APROXIMADO]
    );

    if (semanticRows.rows.length > 0) {
      const best = semanticRows.rows[0];
      const level: CacheHitLevel =
        best.similarity >= THRESHOLD_SEMANTICO ? "semantic" : "approximate";

      await db.query(
        `UPDATE ai_response_cache
         SET uso_count = uso_count + 1, last_accessed = NOW()
         WHERE id = $1`,
        [best.id]
      );

      return {
        hit: true,
        level: level as Exclude<CacheHitLevel, "miss">,
        response: best.response,
        similarity: best.similarity,
        fromCacheId: best.id,
      };
    }

    return { hit: false, level: "miss" };
  } catch (err) {
    // Cache nunca deve quebrar a aplicação
    console.warn("[semanticCache] get error (ignorado):", (err as Error).message);
    return { hit: false, level: "miss" };
  }
}

/**
 * Salva uma resposta gerada por IA no cache.
 * Gera embedding automaticamente para buscas futuras.
 */
export async function cacheSave(
  feature: string,
  query: string,
  response: string,
  modelUsed: string,
  scoreQualidade = 1.0
): Promise<void> {
  const db = getPool();
  const normalized = normalizeQuery(query);
  const hash = hashQuery(normalized);

  try {
    const embedding = await getEmbedding(normalized);
    const vecStr = vectorToPostgres(embedding);

    await db.query(
      `INSERT INTO ai_response_cache
         (feature, query_hash, query_normalized, query_embedding, response, model_used, score_qualidade)
       VALUES ($1, $2, $3, $4::vector, $5, $6, $7)
       ON CONFLICT (feature, query_hash) DO UPDATE
         SET response       = EXCLUDED.response,
             model_used     = EXCLUDED.model_used,
             score_qualidade= EXCLUDED.score_qualidade,
             last_accessed  = NOW()`,
      [feature, hash, normalized, vecStr, response, modelUsed, scoreQualidade]
    );
  } catch (err) {
    console.warn("[semanticCache] save error (ignorado):", (err as Error).message);
  }
}

/**
 * Retorna estatísticas do cache para o painel admin.
 */
export async function cacheStats(): Promise<{
  totalEntradas: number;
  totalHits: number;
  porFeature: { feature: string; entradas: number; hits: number }[];
}> {
  const db = getPool();
  try {
    const total = await db.query<{ entradas: string; hits: string }>(
      `SELECT COUNT(*)::text AS entradas, COALESCE(SUM(uso_count), 0)::text AS hits
       FROM ai_response_cache`
    );
    const byFeature = await db.query<{ feature: string; entradas: string; hits: string }>(
      `SELECT feature,
              COUNT(*)::text AS entradas,
              COALESCE(SUM(uso_count), 0)::text AS hits
       FROM ai_response_cache
       GROUP BY feature
       ORDER BY SUM(uso_count) DESC`
    );

    return {
      totalEntradas: parseInt(total.rows[0]?.entradas ?? "0"),
      totalHits: parseInt(total.rows[0]?.hits ?? "0"),
      porFeature: byFeature.rows.map((r) => ({
        feature: r.feature,
        entradas: parseInt(r.entradas),
        hits: parseInt(r.hits),
      })),
    };
  } catch {
    return { totalEntradas: 0, totalHits: 0, porFeature: [] };
  }
}
