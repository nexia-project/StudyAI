/**
 * Concursos bank — operações de leitura sobre o banco seed de questões.
 *
 * Fonte de dados: `seed-concursos.json`, gerado pelo script
 * `scripts/ingest-concursos.ts` a partir de datasets abertos do Hugging Face
 * (eduagarcia/oab_exams + Larxel/healthqa-br). Tudo in-memory; quando
 * passarmos a Postgres este módulo vira o adapter SQL com a mesma assinatura
 * pública.
 */

import seedFromJson from "./seed-concursos.json";
import type { ConcursoArea, ConcursoBanca, ConcursoQuestao } from "./types";

const SEED_QUESTOES = seedFromJson as unknown as ConcursoQuestao[];

export const CONCURSOS_BANK: readonly ConcursoQuestao[] = Object.freeze([...SEED_QUESTOES]);

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

function matchesQuery(q: ConcursoQuestao, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = normalize(
    [
      q.enunciado,
      q.cargo ?? "",
      q.banca ?? "",
      q.area ?? "",
      q.alternativas.map((a) => a.texto).join(" "),
      q.explicacao ?? "",
    ].join(" "),
  );
  // AND, não OR — todos os tokens precisam aparecer.
  return tokens.every((t) => haystack.includes(t));
}

// ─── API pública ─────────────────────────────────────────────────────────────

export interface SearchConcursosOpts {
  query?: string;
  banca?: ConcursoBanca;
  area?: ConcursoArea;
  ano?: number;
  cargo?: string;
  limit?: number;
}

/**
 * Busca questões com filtros opcionais. `limit` clampado a [1, 50]; default 20.
 * Tokens da `query` precisam TODOS aparecer (AND, não OR) — espelha `searchEnem`.
 */
export function searchConcursos(opts: SearchConcursosOpts = {}): ConcursoQuestao[] {
  const tokens = opts.query ? tokenize(opts.query) : [];
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const cargoNorm = opts.cargo ? normalize(opts.cargo) : "";

  const out: ConcursoQuestao[] = [];
  for (const q of CONCURSOS_BANK) {
    if (opts.banca && q.banca !== opts.banca) continue;
    if (opts.area && q.area !== opts.area) continue;
    if (opts.ano && q.ano !== opts.ano) continue;
    if (cargoNorm) {
      if (!q.cargo || !normalize(q.cargo).includes(cargoNorm)) continue;
    }
    if (!matchesQuery(q, tokens)) continue;
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

/** Lookup direto por id. Retorna null quando não encontra. */
export function getConcursoQuestao(id: string): ConcursoQuestao | null {
  if (!id) return null;
  const hit = CONCURSOS_BANK.find((q) => q.id === id);
  return hit ?? null;
}

/**
 * Retorna uma questão aleatória respeitando filtros opcionais.
 * Útil para "questão do dia" da área concursos.
 */
export function getRandomConcurso(
  opts: { banca?: ConcursoBanca; area?: ConcursoArea } = {},
): ConcursoQuestao | null {
  const pool = CONCURSOS_BANK.filter((q) => {
    if (opts.banca && q.banca !== opts.banca) return false;
    if (opts.area && q.area !== opts.area) return false;
    return true;
  });
  if (pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? null;
}

export interface ConcursosStats {
  total: number;
  porBanca: Record<string, number>;
  porArea: Record<string, number>;
  anos: number[];
  fontes: { fonte: string; total: number }[];
}

/** Total de questões + breakdown por banca/área/ano + fontes (debug / health). */
export function getConcursosSeedStats(): ConcursosStats {
  const porBanca: Record<string, number> = {};
  const porArea: Record<string, number> = {};
  const anosSet = new Set<number>();
  const porFonte: Record<string, number> = {};

  for (const q of CONCURSOS_BANK) {
    const b = q.banca ?? "OUTRO";
    porBanca[b] = (porBanca[b] ?? 0) + 1;
    const a = q.area ?? "OUTROS";
    porArea[a] = (porArea[a] ?? 0) + 1;
    if (typeof q.ano === "number") anosSet.add(q.ano);
    porFonte[q.fonte] = (porFonte[q.fonte] ?? 0) + 1;
  }

  const fontes = Object.entries(porFonte)
    .map(([fonte, total]) => ({ fonte, total }))
    .sort((a, b) => b.total - a.total);

  return {
    total: CONCURSOS_BANK.length,
    porBanca,
    porArea,
    anos: [...anosSet].sort((a, b) => a - b),
    fontes,
  };
}
