/**
 * IBGE — Portal de Dados Abertos (PR-4)
 *
 * A API do IBGE é estruturada por domínio, não tem um único endpoint de busca.
 * Implementamos um *router de intenção* simples: detecta palavras-chave no
 * `query` e chama o endpoint mais apropriado.
 *
 * Domínios suportados nesta versão:
 *   - "pib", "agregado", "indicador"   → /agregados/v3/agregados (catálogo SIDRA)
 *   - "municipio", "cidade", "região"  → /v1/localidades/municipios?search=...
 *   - "país", "paises", "country"      → /v1/paises/paises?nome=...
 *   - "estado", "uf"                   → /v1/localidades/estados
 *   - default                          → tenta agregados + municípios
 *
 * Como o IBGE devolve listas grandes, filtramos manualmente pelo termo da
 * query e cortamos em até 5 resultados úteis.
 */

import {
  DEFAULT_TIMEOUT_MS,
  POLITE_UA,
  truncateSnippet,
  type ExternalSource,
} from "./types.js";

const IBGE_BASE = "https://servicodados.ibge.gov.br/api";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": POLITE_UA },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface AgregadoCatalog {
  id: number;
  agregado: { id: number | string; nome: string };
}

interface AgregadoFlat {
  id: number;
  nome: string;
  url: string;
  pesquisa?: string;
}

/** O endpoint `/agregados` devolve `[{ id, nome, agregados: [{id, nome}] }]`. */
interface AgregadoGroup {
  id: number;
  nome: string;
  agregados: Array<{ id: number; nome: string }>;
}

interface MunicipioHit {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: { UF?: { id: number; sigla: string; nome: string } };
  };
}

interface PaisHit {
  id: { ISO_3166_ALPHA_3?: string; M49?: string };
  nome: { abreviado?: string; abreviado_PT?: string; abreviado_EN?: string };
  area?: { total?: number; unidade?: { nome?: string } };
  localizacao?: {
    regiao?: { nome?: string };
    sub_regiao?: { nome?: string };
  };
}

function lower(s: string): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildAgregadoSnippet(g: AgregadoGroup, a: AgregadoGroup["agregados"][number]): string {
  return `Agregado SIDRA "${a.nome}" (pesquisa: ${g.nome}). ID do agregado: ${a.id}.`;
}

async function searchAgregados(query: string, limit: number): Promise<ExternalSource[]> {
  try {
    const data = (await fetchJson(`${IBGE_BASE}/v3/agregados`)) as AgregadoGroup[];
    if (!Array.isArray(data)) return [];
    const q = lower(query);
    const flat: Array<{ group: AgregadoGroup; agregado: AgregadoGroup["agregados"][number] }> = [];
    for (const g of data) {
      if (!Array.isArray(g.agregados)) continue;
      for (const a of g.agregados) {
        const hay = lower(`${g.nome} ${a.nome}`);
        if (hay.includes(q)) flat.push({ group: g, agregado: a });
      }
    }
    return flat.slice(0, limit).map(({ group, agregado }): ExternalSource => {
      const url = `https://sidra.ibge.gov.br/tabela/${agregado.id}`;
      return {
        id: `ibge:agregado:${agregado.id}`,
        provider: "ibge",
        title: `IBGE/SIDRA — ${agregado.nome}`,
        snippet: truncateSnippet(buildAgregadoSnippet(group, agregado), 300),
        url,
        venue: `IBGE (SIDRA / ${group.nome})`,
        raw: { group, agregado } satisfies AgregadoCatalog | object,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ibge.agregados] erro: ${msg}`);
    return [];
  }
}

async function searchMunicipios(query: string, limit: number): Promise<ExternalSource[]> {
  try {
    const data = (await fetchJson(
      `${IBGE_BASE}/v1/localidades/municipios?orderBy=nome`,
    )) as MunicipioHit[];
    if (!Array.isArray(data)) return [];
    const q = lower(query);
    const hits = data.filter((m) => lower(m.nome).includes(q));
    return hits.slice(0, limit).map((m): ExternalSource => {
      const uf = m.microrregiao?.mesorregiao?.UF;
      const ufLabel = uf ? `${uf.nome} (${uf.sigla})` : "UF desconhecida";
      return {
        id: `ibge:municipio:${m.id}`,
        provider: "ibge",
        title: `${m.nome} — ${uf?.sigla ?? "BR"}`,
        snippet: truncateSnippet(
          `Município brasileiro de ${m.nome}, ${ufLabel}. Código IBGE: ${m.id}.`,
          300,
        ),
        url: `https://cidades.ibge.gov.br/brasil/${uf?.sigla?.toLowerCase() ?? ""}/${
          lower(m.nome).replace(/\s+/g, "-")
        }`,
        venue: "IBGE — Localidades",
        raw: m,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ibge.municipios] erro: ${msg}`);
    return [];
  }
}

async function searchPaises(query: string, limit: number): Promise<ExternalSource[]> {
  try {
    const data = (await fetchJson(`${IBGE_BASE}/v1/paises/paises`)) as PaisHit[];
    if (!Array.isArray(data)) return [];
    const q = lower(query);
    const hits = data.filter((p) => {
      const candidates = [
        p.nome?.abreviado,
        p.nome?.abreviado_PT,
        p.nome?.abreviado_EN,
      ].filter(Boolean) as string[];
      return candidates.some((n) => lower(n).includes(q));
    });
    return hits.slice(0, limit).map((p): ExternalSource => {
      const name = p.nome?.abreviado_PT ?? p.nome?.abreviado ?? p.nome?.abreviado_EN ?? "País";
      const region = p.localizacao?.regiao?.nome ?? "";
      const subregion = p.localizacao?.sub_regiao?.nome ?? "";
      const area = p.area?.total ? `Área: ${p.area.total} ${p.area.unidade?.nome ?? "km²"}.` : "";
      const iso = p.id?.ISO_3166_ALPHA_3 ?? "";
      return {
        id: `ibge:pais:${iso || name}`,
        provider: "ibge",
        title: `País — ${name}`,
        snippet: truncateSnippet(
          `${name}${region ? `, ${region}` : ""}${subregion ? ` (${subregion})` : ""}. ${area}`.trim(),
          300,
        ),
        url: "https://servicodados.ibge.gov.br/api/docs/paises",
        venue: "IBGE — Países",
        raw: p,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ibge.paises] erro: ${msg}`);
    return [];
  }
}

interface EstadoHit {
  id: number;
  sigla: string;
  nome: string;
  regiao?: { sigla?: string; nome?: string };
}

async function searchEstados(query: string, limit: number): Promise<ExternalSource[]> {
  try {
    const data = (await fetchJson(
      `${IBGE_BASE}/v1/localidades/estados?orderBy=nome`,
    )) as EstadoHit[];
    if (!Array.isArray(data)) return [];
    const q = lower(query);
    const hits = data.filter(
      (e) => lower(e.nome).includes(q) || lower(e.sigla).includes(q),
    );
    return hits.slice(0, limit).map((e): ExternalSource => {
      return {
        id: `ibge:estado:${e.id}`,
        provider: "ibge",
        title: `Estado — ${e.nome} (${e.sigla})`,
        snippet: truncateSnippet(
          `Unidade da Federação ${e.nome}, sigla ${e.sigla}, região ${
            e.regiao?.nome ?? "Brasil"
          }. Código IBGE: ${e.id}.`,
          300,
        ),
        url: `https://cidades.ibge.gov.br/brasil/${e.sigla.toLowerCase()}`,
        venue: "IBGE — Estados",
        raw: e,
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ibge.estados] erro: ${msg}`);
    return [];
  }
}

type IbgeDomain = "agregado" | "municipio" | "pais" | "estado";

function routeQuery(query: string): IbgeDomain[] {
  const q = lower(query);
  const domains: IbgeDomain[] = [];
  if (/(pib|inflaç|economia|emprego|desemprego|ipca|inpc|sidra|agregad|censo|populaç|natalidade)/.test(q)) {
    domains.push("agregado");
  }
  if (/(municipi|cidade|prefeitura|capital)/.test(q)) domains.push("municipio");
  if (/(\bestado\b|\buf\b|região\b)/.test(q)) domains.push("estado");
  if (/(país|paises|countr|nação)/.test(q)) domains.push("pais");
  if (domains.length === 0) {
    domains.push("agregado", "municipio");
  }
  return domains;
}

/**
 * Roteia a query para os domínios apropriados da API do IBGE.
 * Limite global de 5 resultados úteis.
 */
export async function searchIBGE(query: string): Promise<ExternalSource[]> {
  const cleaned = String(query ?? "").trim();
  if (cleaned.length < 2) return [];

  const TOTAL_LIMIT = 5;
  const domains = routeQuery(cleaned);
  const perDomainLimit = Math.max(2, Math.ceil(TOTAL_LIMIT / Math.max(1, domains.length)));

  const tasks: Promise<ExternalSource[]>[] = domains.map((d) => {
    switch (d) {
      case "agregado":
        return searchAgregados(cleaned, perDomainLimit);
      case "municipio":
        return searchMunicipios(cleaned, perDomainLimit);
      case "estado":
        return searchEstados(cleaned, perDomainLimit);
      case "pais":
        return searchPaises(cleaned, perDomainLimit);
    }
  });

  try {
    const settled = await Promise.allSettled(tasks);
    const out: ExternalSource[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") out.push(...r.value);
    }
    return out.slice(0, TOTAL_LIMIT);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ibge] erro inesperado: ${msg}`);
    return [];
  }
}
