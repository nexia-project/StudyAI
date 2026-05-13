/**
 * ENEM bank — operações de leitura sobre o seed (PR-3, data scaffolding).
 *
 * Quando o banco oficial estiver carregado em Postgres, este módulo passa a
 * delegar para repositórios reais. Por ora, opera in-memory sobre `ENEM_SEED`.
 */

import { ENEM_SEED } from "./seed";
import type { EnemArea, EnemAno, EnemQuestao } from "./types";

// ─── Utilidades internas ─────────────────────────────────────────────────────

function normalize(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

function matchesQuery(q: EnemQuestao, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = normalize(
    [q.tema, q.disciplina, q.enunciado, q.comando, q.bnccCodigos?.join(" ") ?? ""].join(" "),
  );
  return tokens.every((t) => haystack.includes(t));
}

// ─── API pública ─────────────────────────────────────────────────────────────

export interface SearchEnemOpts {
  query?: string;
  area?: EnemArea;
  ano?: EnemAno;
  limit?: number;
}

/**
 * Busca questões do seed com filtros opcionais.
 * Tokens da query precisam TODOS aparecer (AND, não OR).
 * `limit` é clampado a [1, 50]; default 20.
 */
export function searchEnem(opts: SearchEnemOpts = {}): EnemQuestao[] {
  const tokens = opts.query ? tokenize(opts.query) : [];
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  const filtered: EnemQuestao[] = [];
  for (const q of ENEM_SEED) {
    if (opts.area && q.area !== opts.area) continue;
    if (opts.ano && q.ano !== opts.ano) continue;
    if (!matchesQuery(q, tokens)) continue;
    filtered.push(q);
    if (filtered.length >= limit) break;
  }
  return filtered;
}

/** Lookup direto por id (estável). Retorna null quando não encontra. */
export function getQuestao(id: string): EnemQuestao | null {
  if (!id) return null;
  const hit = ENEM_SEED.find((q) => q.id === id);
  return hit ?? null;
}

/**
 * Retorna uma questão aleatória respeitando filtros opcionais.
 * Útil para o card "questão do dia".
 */
export function getRandomQuestao(
  opts: { area?: EnemArea; ano?: EnemAno } = {},
): EnemQuestao | null {
  const pool = ENEM_SEED.filter((q) => {
    if (opts.area && q.area !== opts.area) return false;
    if (opts.ano && q.ano !== opts.ano) return false;
    return true;
  });
  if (pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? null;
}

/** Total de questões disponíveis no seed (debug / health). */
export function getEnemSeedStats(): {
  total: number;
  porArea: Record<EnemArea, number>;
  anos: EnemAno[];
} {
  const porArea: Record<EnemArea, number> = { LC: 0, MT: 0, CN: 0, CH: 0, R: 0 };
  const anosSet = new Set<EnemAno>();
  for (const q of ENEM_SEED) {
    porArea[q.area] += 1;
    anosSet.add(q.ano);
  }
  return {
    total: ENEM_SEED.length,
    porArea,
    anos: [...anosSet].sort((a, b) => a - b),
  };
}
