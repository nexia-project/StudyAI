/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  StudyAI — Central Knowledge Context Engine                        ║
 * ║                                                                    ║
 * ║  Consulta AUTOMATICAMENTE e em PARALELO três fontes:               ║
 * ║    1. Base de conhecimento local do aluno (FTS PostgreSQL)         ║
 * ║    2. BNCC — Base Nacional Comum Curricular (MEC, 2018)            ║
 * ║    3. Wikipedia em Português (REST API, sem chave)                 ║
 * ║                                                                    ║
 * ║  Utilizado por: plano de estudos, simulado, flashcards, resumão,   ║
 * ║  redação, mapa mental, sala de estudos, Tiagão, simulado ENEM      ║
 * ║                                                                    ║
 * ║  Retorna blocos de texto prontos para injeção em system prompts.   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { searchBncc, getBnccContext } from "../data/bncc-data";
import { searchWikipedia, fetchWikiSummary } from "../routes/wikipedia";
import { cacheGet, cacheSave } from "../lib/semanticCache";
import { logFreeSource } from "../lib/aiCostLogger";
import { searchExatas, formatExatasBlock, type MateriaExatas } from "../data/exatas-data";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface KnowledgeContextOptions {
  /** Main topic / query — e.g. "funções do 2º grau", "Revolução Francesa" */
  query: string;
  /** Subject / disciplina — e.g. "Matemática", "Física", "História" */
  materia?: string;
  /** School year — e.g. "3º ano EM", "Ensino Médio" */
  serie?: string;
  /** Goal — e.g. "ENEM", "vestibular FUVEST", "concurso federal" */
  objetivo?: string;
  /** userId — if provided, also searches the user's own documents */
  userId?: string;
  /** Max chars to include from each source (default: 1200) */
  maxCharsPerSource?: number;
  /** Whether to include Wikipedia (default: true) */
  includeWikipedia?: boolean;
  /** Whether to include BNCC (default: true) */
  includeBncc?: boolean;
  /** Whether to include local knowledge base (default: true if userId provided) */
  includeLocal?: boolean;
  /** Whether to include the curated ENEM formula bank for Exatas (default: auto-detect) */
  includeExatas?: boolean;
}

export interface KnowledgeContextResult {
  /** Full context block ready for system prompt injection */
  contextBlock: string;
  /** BNCC habilidades found */
  bnccHabilidades: string[];
  /** Wikipedia article title used */
  wikiTitle?: string;
  /** Whether any knowledge was found */
  hasKnowledge: boolean;
  /** Summary for logging */
  summary: string;
}

// ─── Main Function ────────────────────────────────────────────────────────────
/**
 * Fetches enriched knowledge context from all available sources in parallel.
 * Designed to be called before any AI generation (study plan, quiz, flashcards, etc.)
 */
export async function getKnowledgeContext(
  opts: KnowledgeContextOptions
): Promise<KnowledgeContextResult> {
  const EXATAS_MATERIAS: Record<string, MateriaExatas> = {
    "matemática": "matematica", "matematica": "matematica", "math": "matematica",
    "física": "fisica", "fisica": "fisica", "physics": "fisica",
    "química": "quimica", "quimica": "quimica", "chemistry": "quimica",
  };

  const {
    query,
    materia,
    serie,
    objetivo,
    userId,
    maxCharsPerSource = 1200,
    includeWikipedia = true,
    includeBncc = true,
    includeLocal = true,
    includeExatas,
  } = opts;

  if (!query.trim()) {
    return { contextBlock: "", bnccHabilidades: [], hasKnowledge: false, summary: "empty query" };
  }

  const parts: string[] = [];
  const bnccCodes: string[] = [];
  let wikiTitle: string | undefined;

  // ── Banco de Fórmulas Exatas (síncrono, in-memory, zero latência) ─────────
  const exatasMateriaKey = (materia ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const exatasMateria = EXATAS_MATERIAS[exatasMateriaKey];
  const shouldIncludeExatas = includeExatas !== false && (
    includeExatas === true ||
    exatasMateria !== undefined ||
    /(?:mat|fis|qui|equa|formul|calcul|area|volume|pressao|energia|força|forca|calor|onda|eletri|circuit|função|funcao|log|trig|sen\b|cos\b|derivad|integral|probabili|estatist)/i.test(query)
  );

  let exatasFormulasCount = 0;
  if (shouldIncludeExatas) {
    const formulas = searchExatas(query, { materia: exatasMateria, limit: 3 });
    if (formulas.length > 0) {
      const exatasBlock = formatExatasBlock(formulas);
      parts.push(exatasBlock);
      exatasFormulasCount = formulas.length;
      logFreeSource("exatas-kb", query.slice(0, 60), exatasBlock.length);
    }
  }

  // ── Cache check: BNCC + Wikipedia (fontes públicas, iguais para todos) ──────
  // A base local do aluno é sempre consultada fresca (é pessoal e muda).
  const publicCacheKey = `${query.slice(0, 100)}:${materia ?? ""}:${serie ?? ""}`;
  const publicCached = (includeBncc || includeWikipedia)
    ? await cacheGet("knowledge-ctx", publicCacheKey)
    : { hit: false as const, level: "miss" as const };

  let localResult: PromiseSettledResult<string>;

  if (publicCached.hit) {
    // ── Cache HIT: pula BNCC + Wikipedia, usa bloco público salvo ──────────
    const cached = JSON.parse(publicCached.response) as {
      bnccBlock?: string;
      wikiBlock?: string;
      bnccCodes: string[];
      wikiTitle?: string;
    };

    if (cached.bnccBlock) parts.push(cached.bnccBlock);
    if (cached.wikiBlock) parts.push(cached.wikiBlock);
    bnccCodes.push(...cached.bnccCodes);
    wikiTitle = cached.wikiTitle;

    // Consulta local do aluno (sempre fresca)
    const [_localRes] = await Promise.allSettled([(includeLocal && userId) ? (async () => {
      const { searchKnowledge } = await import("../routes/knowledge");
      return await searchKnowledge(query, materia, 3);
    })() : Promise.resolve("")]);
    localResult = _localRes;

  } else {
    // ── Cache MISS: consulta tudo em paralelo ────────────────────────────────
    const [bnccResult, wikiResult, localRes] = await Promise.allSettled([
      // ── 1. BNCC ────────────────────────────────────────────────────────────
      includeBncc ? (async () => {
        const habilidades = searchBncc(query, materia, undefined);
        if (!habilidades.length) return "";
        const top5 = habilidades.slice(0, 5);
        const lines = top5.map(h =>
          `• [${h.codigo}] ${h.componente}${h.unidade ? " — " + h.unidade : ""}: ${h.descricao.slice(0, 200)}`
        );
        return { text: lines.join("\n"), codes: top5.map(h => h.codigo) };
      })() : Promise.resolve(""),

      // ── 2. Wikipedia PT ────────────────────────────────────────────────────
      includeWikipedia ? (async () => {
        const searchQuery = materia ? `${query} ${materia}` : query;
        const results = await searchWikipedia(searchQuery, 3);
        if (!results.length) return null;
        const best = results[0];
        const summary = await fetchWikiSummary(best.title);
        if (!summary?.extract) return null;
        return {
          title: summary.title,
          description: summary.description || "",
          extract: summary.extract.slice(0, maxCharsPerSource),
          url: summary.url,
        };
      })() : Promise.resolve(null),

      // ── 3. Local Knowledge Base ────────────────────────────────────────────
      (includeLocal && userId) ? (async () => {
        const { searchKnowledge } = await import("../routes/knowledge");
        return await searchKnowledge(query, materia, 3);
      })() : Promise.resolve(""),
    ]);

    localResult = localRes;

    // Monta blocos BNCC e Wikipedia e salva no cache público
    let bnccBlock: string | undefined;
    let wikiBlock: string | undefined;

    if (bnccResult.status === "fulfilled" && bnccResult.value) {
      const val = bnccResult.value as { text: string; codes: string[] } | string;
      if (typeof val === "object" && val.text) {
        bnccBlock =
          `━━━ BNCC — BASE NACIONAL COMUM CURRICULAR (MEC) ━━━\n` +
          `Habilidades relacionadas ao conteúdo (use para fundamentar e alinhar):\n${val.text}`;
        parts.push(bnccBlock);
        bnccCodes.push(...val.codes);
        logFreeSource("bncc-local", query.slice(0, 60), bnccBlock.length);
      }
    }

    if (wikiResult.status === "fulfilled" && wikiResult.value) {
      const wiki = wikiResult.value as { title: string; description: string; extract: string; url: string } | null;
      if (wiki) {
        wikiTitle = wiki.title;
        wikiBlock = [
          `━━━ WIKIPEDIA PT — ${wiki.title.toUpperCase()} ━━━`,
          wiki.description ? `Definição: ${wiki.description}` : "",
          wiki.extract,
          `Fonte: ${wiki.url}`,
        ].filter(Boolean).join("\n");
        parts.push(wikiBlock);
        logFreeSource("wikipedia-api", query.slice(0, 60), wikiBlock.length);
      }
    }

    // Salva BNCC + Wikipedia no cache para futuras requisições similares
    if (bnccBlock || wikiBlock) {
      cacheSave(
        "knowledge-ctx",
        publicCacheKey,
        JSON.stringify({ bnccBlock, wikiBlock, bnccCodes, wikiTitle }),
        "bncc+wikipedia"
      ).catch(() => {});
    }
  }

  // ── Assemble local KB block ────────────────────────────────────────────────
  if (localResult.status === "fulfilled" && localResult.value) {
    const local = localResult.value as string;
    if (local.trim()) {
      parts.push(
        `━━━ BASE DE CONHECIMENTO DO ALUNO ━━━\n` +
        `(Conteúdo enviado pelo próprio aluno — priorize este material):\n${local.slice(0, maxCharsPerSource)}`
      );
      logFreeSource("fts-kb", query.slice(0, 60), local.length);
    }
  }

  if (!parts.length) {
    return { contextBlock: "", bnccHabilidades: bnccCodes, hasKnowledge: false, summary: "no sources returned content" };
  }

  // ── Final context block ────────────────────────────────────────────────────
  const header = buildHeader({ query, materia, serie, objetivo });
  const contextBlock = `

╔═══════════════════════════════════════════════════════════════╗
║         CONTEXTO DE CONHECIMENTO — CONSULTA AUTOMÁTICA       ║
║  Fontes: Banco Exatas + BNCC (MEC) + Wikipedia PT + Aluno    ║
╚═══════════════════════════════════════════════════════════════╝
${header}

${parts.join("\n\n")}

INSTRUÇÕES OBRIGATÓRIAS:
- Use TODOS os dados acima para fundamentar o conteúdo gerado.
- Cite os códigos BNCC (ex: EM13MAT201) sempre que relevante.
- Se a Wikipedia trouxer definição ou fórmula, use-a com precisão.
- O conteúdo do aluno tem prioridade sobre fontes externas.
- NUNCA invente fórmulas, datas ou fatos — use apenas o que está documentado acima.
- Para Matemática/Física/Química: use APENAS as fórmulas do "BANCO DE FÓRMULAS ENEM" acima. Não altere coeficientes, expoentes ou variáveis.
`;

  return {
    contextBlock,
    bnccHabilidades: bnccCodes,
    wikiTitle,
    hasKnowledge: true,
    summary: `Exatas: ${exatasFormulasCount} fórmulas | BNCC: ${bnccCodes.length} habilidades | Wiki: ${wikiTitle || "nenhuma"} | Local: ${localResult.status === "fulfilled" && localResult.value ? "sim" : "não"}`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildHeader(opts: Pick<KnowledgeContextOptions, "query" | "materia" | "serie" | "objetivo">): string {
  const lines: string[] = [];
  if (opts.materia) lines.push(`Disciplina: ${opts.materia}`);
  if (opts.serie) lines.push(`Nível: ${opts.serie}`);
  if (opts.objetivo) lines.push(`Objetivo: ${opts.objetivo}`);
  if (opts.query) lines.push(`Tópico: ${opts.query}`);
  return lines.join(" | ");
}

/**
 * Lightweight version — only BNCC, no external calls.
 * Use when you need speed and the topic is well-defined (e.g. inline chat).
 */
export function getBnccContextFast(query: string, materia?: string): string {
  return getBnccContext(query, materia);
}

/**
 * Convenience: build a concise BNCC instruction appendix for math/science prompts
 * to prevent AI hallucination of formulas or definitions.
 */
export function getMathSafetyBlock(topic: string): string {
  const habs = searchBncc(topic, "Matemática");
  if (!habs.length) return "";
  const habilidade = habs[0];
  return `\n\n⚠️ ANTI-ALUCINAÇÃO MATEMÁTICA:\nBNCC ${habilidade.codigo}: "${habilidade.descricao}"\nUse APENAS as definições, fórmulas e propriedades reconhecidas pela BNCC/MEC para este tópico. Não invente variações ou simplifique erroneamente.`;
}
