/**
 * RAG Multi-fonte — Tipos compartilhados (PR-4)
 *
 * Estende o `ExternalSource` definido em `routes/scholar.ts` (PR-1) para suportar
 * múltiplos provedores externos. Cada provedor preenche o que conseguir;
 * campos opcionais ficam undefined.
 *
 * IMPORTANTE: o `ExternalSource` original (PR-1) tem `provider: "semantic-scholar"`
 * literal e vários campos obrigatórios. Aqui definimos uma versão alargada que
 * é compatível com aquele tipo (qualquer `ExternalSource` do scholar é um
 * `MultiSourceItem` válido).
 */

import type { ExternalSource as ScholarSource } from "../../routes/scholar.js";

export type RagProvider =
  | "semantic-scholar"
  | "scielo"
  | "wikipedia"
  | "wikidata"
  | "ibge"
  | "arxiv"
  | "crossref";

/**
 * Forma unificada de um resultado de qualquer fonte externa.
 * Mantém compatibilidade com `ExternalSource` do PR-1 (scholar) — todos os
 * campos obrigatórios do scholar continuam obrigatórios aqui via união.
 */
export type MultiSourceItem = {
  /** ID estável para deduplicação. Geralmente `provider:identificador`. */
  id: string;
  provider: RagProvider;
  title: string;
  /** Resumo curto (~300 chars) usado em prompts e UI. */
  snippet: string;
  authors?: string[];
  year?: number | null;
  url?: string;
  doi?: string | null;
  venue?: string | null;
  /** Texto longo opcional (abstract, descrição completa, etc.). */
  abstract?: string;
  /** Payload bruto da fonte (para debug / re-extração). */
  raw?: unknown;
};

/**
 * Alias amigável para o resto do código — `ExternalSource` aqui é o tipo
 * unificado multi-fonte. Quem precisar do tipo estrito do PR-1 deve importar
 * de `routes/scholar.ts`.
 */
export type ExternalSource = MultiSourceItem;

/**
 * Verifica em runtime se um valor parece um `ExternalSource` do PR-1 (scholar).
 * Útil quando normalizamos resultados vindos de `searchSemanticScholar`.
 */
export function isScholarSource(s: unknown): s is ScholarSource {
  return (
    typeof s === "object" &&
    s !== null &&
    (s as { provider?: unknown }).provider === "semantic-scholar"
  );
}

/**
 * Converte um `ExternalSource` do scholar (PR-1) no formato unificado.
 * Como o scholar já é compatível por estrutura, a conversão é praticamente
 * uma cópia — mas isolamos aqui para mudar livremente o formato unificado
 * sem quebrar o scholar.
 */
export function fromScholar(s: ScholarSource): MultiSourceItem {
  return {
    id: s.id,
    provider: "semantic-scholar",
    title: s.title,
    snippet: s.snippet,
    authors: s.authors,
    year: s.year ?? null,
    url: s.url,
    doi: s.doi ?? null,
    venue: s.venue ?? null,
    abstract: s.abstract,
    raw: s,
  };
}

/** Trunca strings preservando palavras inteiras quando possível. */
export function truncateSnippet(text: string, max = 300): string {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

/** Limpa tags HTML simples (snippets da Wikipedia vêm com `<span>`). */
export function stripHtml(text: string): string {
  return String(text ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Timeout padrão (ms) para chamadas HTTP em provedores externos. */
export const DEFAULT_TIMEOUT_MS = 8_000;

/** User-Agent "polite" para APIs que pedem identificação (Crossref, Wikipedia). */
export const POLITE_UA = "StudyAI/1.0 (study.ia.br; mailto:contato@study.ia.br)";
