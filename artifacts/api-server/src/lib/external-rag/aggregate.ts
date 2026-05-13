/**
 * RAG Multi-fonte — Agregador (PR-4)
 *
 * Fan-out paralelo entre os provedores externos, dedupe por (URL || DOI),
 * sort por (provider rank + recency) e corte final.
 */

import { searchSemanticScholar } from "../../routes/scholar.js";
import { searchSciELO } from "./scielo.js";
import { searchWikipedia } from "./wikipedia.js";
import { searchWikidata } from "./wikidata.js";
import { searchIBGE } from "./ibge.js";
import { searchArxiv } from "./arxiv.js";
import { searchCrossref } from "./crossref.js";
import { fromScholar, type ExternalSource, type RagProvider } from "./types.js";

export type { ExternalSource, RagProvider } from "./types.js";

export interface AggregateOpts {
  perProviderLimit?: number;
  totalLimit?: number;
}

export interface ProviderDescriptor {
  id: RagProvider;
  label: string;
  description: string;
  language: "pt-br" | "multi" | "en";
  domain: string;
  freeApiKey: "none" | "optional" | "required";
}

/**
 * Catálogo de provedores. Exposto pelo endpoint `GET /api/rag/providers`.
 */
export const PROVIDERS: ProviderDescriptor[] = [
  {
    id: "semantic-scholar",
    label: "Semantic Scholar",
    description:
      "Buscador acadêmico com 200M+ artigos, citações e abstracts. Cobre quase todas as áreas.",
    language: "multi",
    domain: "academic",
    freeApiKey: "optional",
  },
  {
    id: "scielo",
    label: "SciELO",
    description:
      "Base de periódicos científicos da América Latina (Brasil/PT-BR forte). Ideal para temas regionais.",
    language: "pt-br",
    domain: "academic",
    freeApiKey: "none",
  },
  {
    id: "wikipedia",
    label: "Wikipédia",
    description:
      "Enciclopédia livre multilíngue (padrão PT-BR). Bom para visão geral de tópicos.",
    language: "pt-br",
    domain: "encyclopedic",
    freeApiKey: "none",
  },
  {
    id: "wikidata",
    label: "Wikidata",
    description:
      "Base de dados estruturada com fatos verificáveis (datas, locais, relações).",
    language: "multi",
    domain: "facts",
    freeApiKey: "none",
  },
  {
    id: "ibge",
    label: "IBGE",
    description:
      "Estatísticas oficiais brasileiras (Censo, PIB, municípios, estados, países).",
    language: "pt-br",
    domain: "statistics",
    freeApiKey: "none",
  },
  {
    id: "arxiv",
    label: "arXiv",
    description:
      "Preprints em exatas, computação, física e matemática. Acesso aberto.",
    language: "en",
    domain: "academic",
    freeApiKey: "none",
  },
  {
    id: "crossref",
    label: "Crossref",
    description:
      "Registro global de DOIs com metadados de papers acadêmicos.",
    language: "multi",
    domain: "academic",
    freeApiKey: "none",
  },
];

/** Lista todos os provedores conhecidos. */
export const ALL_PROVIDERS: RagProvider[] = PROVIDERS.map((p) => p.id);

const PROVIDER_RANK: Record<RagProvider, number> = {
  "semantic-scholar": 0,
  scielo: 1,
  crossref: 2,
  arxiv: 3,
  ibge: 4,
  wikipedia: 5,
  wikidata: 6,
};

const CURRENT_YEAR = new Date().getUTCFullYear();

/** Normaliza chave de deduplicação (URL || DOI || id). */
function dedupeKey(s: ExternalSource): string {
  if (s.doi) return `doi:${s.doi.toLowerCase()}`;
  if (s.url) return `url:${s.url.replace(/[#?].*$/, "").toLowerCase()}`;
  return s.id.toLowerCase();
}

/**
 * Heurística de relevância: rank do provedor + recência (até 5 anos pesa muito).
 * Menor número = melhor.
 */
function relevanceScore(s: ExternalSource): number {
  const rank = PROVIDER_RANK[s.provider] ?? 99;
  if (typeof s.year === "number" && Number.isFinite(s.year)) {
    const age = Math.max(0, CURRENT_YEAR - s.year);
    return rank * 100 + Math.min(age, 50);
  }
  return rank * 100 + 25;
}

interface ProviderJob {
  provider: RagProvider;
  run: () => Promise<ExternalSource[]>;
}

function buildJob(provider: RagProvider, query: string, perProviderLimit: number): ProviderJob {
  switch (provider) {
    case "semantic-scholar":
      return {
        provider,
        run: async () => {
          const r = await searchSemanticScholar(query, { limit: perProviderLimit });
          return r.map(fromScholar);
        },
      };
    case "scielo":
      return { provider, run: () => searchSciELO(query, perProviderLimit) };
    case "wikipedia":
      return { provider, run: () => searchWikipedia(query, "pt", perProviderLimit) };
    case "wikidata":
      return { provider, run: () => searchWikidata(query, "pt", perProviderLimit) };
    case "ibge":
      return { provider, run: () => searchIBGE(query) };
    case "arxiv":
      return { provider, run: () => searchArxiv(query, perProviderLimit) };
    case "crossref":
      return { provider, run: () => searchCrossref(query, perProviderLimit) };
  }
}

/**
 * Busca em vários provedores em paralelo, dedupa por URL/DOI, ordena por
 * relevância e corta. Sempre devolve array (vazio se tudo falhar).
 */
export async function searchExternalRag(
  query: string,
  providers: RagProvider[],
  opts: AggregateOpts = {},
): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2 || providers.length === 0) return [];

  const perProviderLimit = Math.max(1, Math.min(opts.perProviderLimit ?? 5, 10));
  const totalLimit = Math.max(1, Math.min(opts.totalLimit ?? 15, 30));

  const uniqueProviders = Array.from(new Set(providers));
  const jobs = uniqueProviders.map((p) => buildJob(p, cleaned, perProviderLimit));

  const settled = await Promise.allSettled(jobs.map((j) => j.run()));
  const all: ExternalSource[] = [];
  settled.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.warn(`[rag.aggregate] provider ${jobs[idx].provider} falhou: ${reason}`);
    }
  });

  const seen = new Map<string, ExternalSource>();
  for (const s of all) {
    const key = dedupeKey(s);
    if (!seen.has(key)) seen.set(key, s);
  }

  const sorted = Array.from(seen.values()).sort(
    (a, b) => relevanceScore(a) - relevanceScore(b),
  );

  return sorted.slice(0, totalLimit);
}

const PT_HINTS = [
  "brasil",
  "brasileir",
  "brasilei",
  "ibge",
  "censo",
  "pib",
  "história do brasil",
  "literatura brasileira",
  "matemática",
  "português",
  "lingua portuguesa",
  "constituição",
];

const ACADEMIC_HINTS = [
  "paper",
  "papers",
  "artigo",
  "artigos",
  "pesquisa",
  "citation",
  "citação",
  "doi",
  "preprint",
  "publicação",
  "review",
  "revisão sistemática",
  "abstract",
];

const FACTUAL_HINTS = [
  "quem é",
  "quem foi",
  "o que é",
  "o que são",
  "definição",
  "significado",
  "quando ",
  "onde fica",
  "qual é",
];

function lower(s: string): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Heurística para escolher provedores quando o cliente não os especifica.
 * Sempre devolve pelo menos 1 provedor.
 */
export function pickProvidersForQuery(query: string): RagProvider[] {
  const q = lower(query);
  const picked = new Set<RagProvider>();

  const hasPt = PT_HINTS.some((t) => q.includes(lower(t)));
  const hasAcademic = ACADEMIC_HINTS.some((t) => q.includes(lower(t)));
  const hasFactual = FACTUAL_HINTS.some((t) => q.includes(lower(t)));

  if (hasPt) {
    picked.add("scielo");
    picked.add("wikipedia");
    picked.add("ibge");
  }
  if (hasAcademic) {
    picked.add("semantic-scholar");
    picked.add("arxiv");
    picked.add("crossref");
  }
  if (hasFactual) {
    picked.add("wikipedia");
    picked.add("wikidata");
  }

  if (picked.size === 0) {
    picked.add("semantic-scholar");
    picked.add("wikipedia");
    picked.add("scielo");
  }

  return Array.from(picked);
}
