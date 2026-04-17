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
  } = opts;

  if (!query.trim()) {
    return { contextBlock: "", bnccHabilidades: [], hasKnowledge: false, summary: "empty query" };
  }

  const parts: string[] = [];
  const bnccCodes: string[] = [];
  let wikiTitle: string | undefined;

  // Run all sources in parallel for speed
  const [bnccResult, wikiResult, localResult] = await Promise.allSettled([
    // ── 1. BNCC ────────────────────────────────────────────────────────────────
    includeBncc ? (async () => {
      const habilidades = searchBncc(query, materia, undefined);
      if (!habilidades.length) return "";
      const top5 = habilidades.slice(0, 5);
      const lines = top5.map(h =>
        `• [${h.codigo}] ${h.componente}${h.unidade ? " — " + h.unidade : ""}: ${h.descricao.slice(0, 200)}`
      );
      return { text: lines.join("\n"), codes: top5.map(h => h.codigo) };
    })() : Promise.resolve(""),

    // ── 2. Wikipedia PT ────────────────────────────────────────────────────────
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

    // ── 3. Local Knowledge Base ────────────────────────────────────────────────
    (includeLocal && userId) ? (async () => {
      const { searchKnowledge } = await import("../routes/knowledge");
      return await searchKnowledge(query, materia, 3);
    })() : Promise.resolve(""),
  ]);

  // ── Assemble BNCC block ────────────────────────────────────────────────────
  if (bnccResult.status === "fulfilled" && bnccResult.value) {
    const val = bnccResult.value as { text: string; codes: string[] } | string;
    if (typeof val === "object" && val.text) {
      parts.push(
        `━━━ BNCC — BASE NACIONAL COMUM CURRICULAR (MEC) ━━━\n` +
        `Habilidades relacionadas ao conteúdo (use para fundamentar e alinhar):\n${val.text}`
      );
      bnccCodes.push(...val.codes);
    }
  }

  // ── Assemble Wikipedia block ───────────────────────────────────────────────
  if (wikiResult.status === "fulfilled" && wikiResult.value) {
    const wiki = wikiResult.value as { title: string; description: string; extract: string; url: string } | null;
    if (wiki) {
      wikiTitle = wiki.title;
      const wikiBlock = [
        `━━━ WIKIPEDIA PT — ${wiki.title.toUpperCase()} ━━━`,
        wiki.description ? `Definição: ${wiki.description}` : "",
        wiki.extract,
        `Fonte: ${wiki.url}`,
      ].filter(Boolean).join("\n");
      parts.push(wikiBlock);
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
║  Fontes: BNCC (MEC) + Wikipedia PT + Base do Aluno           ║
╚═══════════════════════════════════════════════════════════════╝
${header}

${parts.join("\n\n")}

INSTRUÇÕES OBRIGATÓRIAS:
- Use TODOS os dados acima para fundamentar o conteúdo gerado.
- Cite os códigos BNCC (ex: EM13MAT201) sempre que relevante.
- Se a Wikipedia trouxer definição ou fórmula, use-a com precisão.
- O conteúdo do aluno tem prioridade sobre fontes externas.
- NUNCA invente fórmulas, datas ou fatos — use apenas o que está documentado acima.
- Para Matemática: use apenas as fórmulas e definições do contexto BNCC/Wikipedia.
`;

  return {
    contextBlock,
    bnccHabilidades: bnccCodes,
    wikiTitle,
    hasKnowledge: true,
    summary: `BNCC: ${bnccCodes.length} habilidades | Wiki: ${wikiTitle || "nenhuma"} | Local: ${localResult.status === "fulfilled" && localResult.value ? "sim" : "não"}`,
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
