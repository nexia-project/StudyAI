/**
 * BNCC — busca textual sobre o seed de competências (PR-3, data scaffolding).
 *
 * Implementação INTENCIONALMENTE simples: matching por substring com
 * normalização (lowercase + remoção de acentos). Não usa dependências
 * externas. Quando o dataset crescer (~240 itens) e/ou rodar em produção,
 * substituir por um índice invertido / Postgres FTS (vide ingest-bncc.ts).
 */

import {
  BNCC_AREAS,
  BNCC_AREA_BY_CODIGO,
  BNCC_COMPETENCIAS_ESPECIFICAS,
  type BnccArea,
  type BnccAreaCodigo,
  type BnccCompetenciaEspecifica,
} from "./data";

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** lowercase + remove diacríticos (NFD) para comparações tolerantes. */
function normalize(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Quebra a query em tokens significativos (>=3 chars). */
function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** Resolve um identificador de área (sigla, nome completo ou parcial). */
function resolveAreaCodigo(input: string | undefined): BnccAreaCodigo | null {
  if (!input) return null;
  const raw = String(input).trim().toUpperCase();
  if (raw === "LGG" || raw === "MAT" || raw === "CNT" || raw === "CHS") {
    return raw;
  }
  const norm = normalize(input);
  const hit = BNCC_AREAS.find((a) => normalize(a.nome).includes(norm));
  return hit ? hit.codigo : null;
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Pesquisa competências específicas por texto livre.
 *
 * Score = soma de tokens encontrados em código + descrição + palavras-chave.
 * Empate é desfeito mantendo a ordem do seed (estável). Retorna top 10.
 *
 * @param query texto de busca (pode ser vazio — devolve top-N inicial)
 * @param area  filtro opcional: sigla (LGG/MAT/CNT/CHS) ou nome
 */
export function findBnccCompetencias(
  query: string,
  area?: string,
): BnccCompetenciaEspecifica[] {
  const tokens = tokenize(query);
  const areaCodigo = resolveAreaCodigo(area);

  const scored: { item: BnccCompetenciaEspecifica; score: number; idx: number }[] = [];

  BNCC_COMPETENCIAS_ESPECIFICAS.forEach((item, idx) => {
    if (areaCodigo && item.area !== areaCodigo) return;

    if (tokens.length === 0) {
      scored.push({ item, score: 0, idx });
      return;
    }

    const haystack = normalize(
      `${item.codigo} ${item.descricao} ${item.palavrasChave.join(" ")}`,
    );
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 1;
      if (normalize(item.codigo).includes(token)) score += 2; // peso extra: match no código
    }
    if (score > 0) scored.push({ item, score, idx });
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });

  return scored.slice(0, 10).map((s) => s.item);
}

/**
 * Retorna a área pelo nome (busca tolerante a acento/case) ou null.
 */
export function getAreaByName(name: string): BnccArea | null {
  if (!name) return null;
  const codigo = resolveAreaCodigo(name);
  return codigo ? BNCC_AREA_BY_CODIGO[codigo] : null;
}
