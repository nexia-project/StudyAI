import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { persistDescoberta } from "../persist";
import { type HermesRecommendation } from "../recommendationStandard";

/** Contagem de documentos pai na base global (knowledge_documents). */
export async function countKnowledgeDocuments(): Promise<number> {
  try {
    const res = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM knowledge_documents
      WHERE is_chunk = false OR is_chunk IS NULL
    `);
    return Number((res.rows[0] as { count?: number })?.count ?? 0);
  } catch {
    return 0;
  }
}

export interface MateriaCount {
  materia: string;
  count: number;
}

export interface GeneratedContentSample {
  kind: string;
  title: string;
  materia: string | null;
  createdAt: string;
}

export interface ContentIndexSummary {
  scannedAt: string;
  knowledgeDocuments: {
    totalParents: number;
    postulados: number;
    chunks: number;
    byMateria: MateriaCount[];
  };
  knowledgeBase: {
    total: number;
    distinctUsers: number;
    bySubject: MateriaCount[];
  };
  boardLessons: {
    total: number;
    ready: number;
    generating: number;
    bySubject: MateriaCount[];
  };
  generatedContent: {
    totalActive: number;
    byMateria: MateriaCount[];
    byKind: MateriaCount[];
    recentSamples: GeneratedContentSample[];
  };
  /** Matérias com demanda interna (KB/gerados) mas pouco ou nenhum postulado. */
  contentGaps: string[];
  keywordStats: {
    topMaterias: MateriaCount[];
    postuladoCoverageRatio: number;
  };
}

const GAP_KEYWORDS = [
  "lacuna",
  "gap",
  "conteúdo",
  "conteudo",
  "postulado",
  "matéria",
  "materia",
  "cobertura",
  "ingest",
  "base de conhecimento",
];

function normalizeMateria(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().slice(0, 120);
}

async function countPostulados(): Promise<number> {
  try {
    const res = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM knowledge_documents
      WHERE (is_chunk = false OR is_chunk IS NULL)
        AND (
          metadata->>'source' = 'postulado'
          OR 'postulado' = ANY(COALESCE(tags, '{}'))
          OR source_file LIKE 'postulado:%'
        )
    `);
    return Number((res.rows[0] as { count?: number })?.count ?? 0);
  } catch {
    return 0;
  }
}

async function countChunks(): Promise<number> {
  try {
    const res = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM knowledge_documents WHERE is_chunk = true
    `);
    return Number((res.rows[0] as { count?: number })?.count ?? 0);
  } catch {
    return 0;
  }
}

async function knowDocsByMateria(): Promise<MateriaCount[]> {
  try {
    const res = await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(subject), ''), NULLIF(metadata->>'materia', ''), 'sem_matéria') AS materia,
        COUNT(*)::int AS count
      FROM knowledge_documents
      WHERE is_chunk = false OR is_chunk IS NULL
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 20
    `);
    return (res.rows as { materia?: string; count?: number }[]).map((r) => ({
      materia: String(r.materia ?? "sem_matéria"),
      count: Number(r.count ?? 0),
    }));
  } catch {
    return [];
  }
}

async function postuladosByMateria(): Promise<MateriaCount[]> {
  try {
    const res = await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(subject), ''), NULLIF(metadata->>'materia', ''), 'sem_matéria') AS materia,
        COUNT(*)::int AS count
      FROM knowledge_documents
      WHERE (is_chunk = false OR is_chunk IS NULL)
        AND (
          metadata->>'source' = 'postulado'
          OR 'postulado' = ANY(COALESCE(tags, '{}'))
          OR source_file LIKE 'postulado:%'
        )
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 20
    `);
    return (res.rows as { materia?: string; count?: number }[]).map((r) => ({
      materia: String(r.materia ?? "sem_matéria"),
      count: Number(r.count ?? 0),
    }));
  } catch {
    return [];
  }
}

async function knowledgeBaseStats(): Promise<{
  total: number;
  distinctUsers: number;
  bySubject: MateriaCount[];
}> {
  try {
    const totals = await db.execute(sql`
      SELECT COUNT(*)::int AS total, COUNT(DISTINCT user_id)::int AS users
      FROM knowledge_base
    `);
    const row = totals.rows[0] as { total?: number; users?: number };
    const byRes = await db.execute(sql`
      SELECT COALESCE(NULLIF(TRIM(subject), ''), 'sem_matéria') AS materia, COUNT(*)::int AS count
      FROM knowledge_base
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 15
    `);
    return {
      total: Number(row?.total ?? 0),
      distinctUsers: Number(row?.users ?? 0),
      bySubject: (byRes.rows as { materia?: string; count?: number }[]).map((r) => ({
        materia: String(r.materia ?? "sem_matéria"),
        count: Number(r.count ?? 0),
      })),
    };
  } catch {
    return { total: 0, distinctUsers: 0, bySubject: [] };
  }
}

async function boardLessonsStats(): Promise<{
  total: number;
  ready: number;
  generating: number;
  bySubject: MateriaCount[];
}> {
  try {
    const statusRes = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'ready')::int AS ready,
        COUNT(*) FILTER (WHERE status IN ('generating', 'pending'))::int AS generating
      FROM board_lessons
    `);
    const s = statusRes.rows[0] as { total?: number; ready?: number; generating?: number };
    const byRes = await db.execute(sql`
      SELECT COALESCE(NULLIF(TRIM(subject), ''), 'sem_matéria') AS materia, COUNT(*)::int AS count
      FROM board_lessons
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 15
    `);
    return {
      total: Number(s?.total ?? 0),
      ready: Number(s?.ready ?? 0),
      generating: Number(s?.generating ?? 0),
      bySubject: (byRes.rows as { materia?: string; count?: number }[]).map((r) => ({
        materia: String(r.materia ?? "sem_matéria"),
        count: Number(r.count ?? 0),
      })),
    };
  } catch {
    return { total: 0, ready: 0, generating: 0, bySubject: [] };
  }
}

async function generatedContentStats(): Promise<{
  totalActive: number;
  byMateria: MateriaCount[];
  byKind: MateriaCount[];
  recentSamples: GeneratedContentSample[];
}> {
  try {
    const totalRes = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM generated_content WHERE deleted_at IS NULL
    `);
    const byMat = await db.execute(sql`
      SELECT COALESCE(NULLIF(TRIM(materia), ''), 'sem_matéria') AS materia, COUNT(*)::int AS count
      FROM generated_content
      WHERE deleted_at IS NULL
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 15
    `);
    const byKind = await db.execute(sql`
      SELECT kind AS materia, COUNT(*)::int AS count
      FROM generated_content
      WHERE deleted_at IS NULL
      GROUP BY kind
      ORDER BY count DESC
      LIMIT 12
    `);
    const samples = await db.execute(sql`
      SELECT kind, title, materia, created_at
      FROM generated_content
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    return {
      totalActive: Number((totalRes.rows[0] as { count?: number })?.count ?? 0),
      byMateria: (byMat.rows as { materia?: string; count?: number }[]).map((r) => ({
        materia: String(r.materia ?? "sem_matéria"),
        count: Number(r.count ?? 0),
      })),
      byKind: (byKind.rows as { materia?: string; count?: number }[]).map((r) => ({
        materia: String(r.materia ?? "outro"),
        count: Number(r.count ?? 0),
      })),
      recentSamples: (samples.rows as {
        kind?: string;
        title?: string;
        materia?: string | null;
        created_at?: Date | string;
      }[]).map((r) => ({
        kind: String(r.kind ?? ""),
        title: String(r.title ?? "").slice(0, 120),
        materia: normalizeMateria(r.materia ?? null),
        createdAt:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String(r.created_at ?? ""),
      })),
    };
  } catch {
    return { totalActive: 0, byMateria: [], byKind: [], recentSamples: [] };
  }
}

/** Agrega contagens de matéria de várias fontes (chave normalizada em minúsculas). */
function mergeMateriaDemand(
  ...lists: MateriaCount[][]
): Map<string, { label: string; demand: number; postulados: number }> {
  const map = new Map<string, { label: string; demand: number; postulados: number }>();

  const add = (items: MateriaCount[], field: "demand" | "postulados") => {
    for (const { materia, count } of items) {
      if (materia === "sem_matéria" || count <= 0) continue;
      const key = materia.toLowerCase();
      const cur = map.get(key) ?? { label: materia, demand: 0, postulados: 0 };
      cur[field] += count;
      if (!map.has(key)) map.set(key, cur);
      else map.set(key, { ...cur, label: cur.label || materia });
    }
  };

  add(lists[0] ?? [], "postulados");
  for (let i = 1; i < lists.length; i++) add(lists[i] ?? [], "demand");
  return map;
}

function detectContentGaps(
  postuladoByMateria: MateriaCount[],
  demandSources: MateriaCount[][],
): string[] {
  const merged = mergeMateriaDemand(postuladoByMateria, ...demandSources);
  const gaps: string[] = [];

  for (const [, v] of merged) {
    if (v.demand >= 5 && v.postulados === 0) {
      gaps.push(`${v.label} (demanda ${v.demand}, 0 postulados)`);
    } else if (v.demand >= 10 && v.postulados > 0 && v.postulados < v.demand * 0.15) {
      gaps.push(`${v.label} (demanda ${v.demand}, só ${v.postulados} postulado(s))`);
    }
  }

  return gaps.slice(0, 8);
}

function buildTopMateriasKeywordStats(
  postuladoByMateria: MateriaCount[],
  kb: MateriaCount[],
  board: MateriaCount[],
  generated: MateriaCount[],
): { topMaterias: MateriaCount[]; postuladoCoverageRatio: number } {
  const totals = new Map<string, number>();
  const addAll = (list: MateriaCount[], weight: number) => {
    for (const { materia, count } of list) {
      if (materia === "sem_matéria") continue;
      const key = materia.toLowerCase();
      totals.set(key, (totals.get(key) ?? 0) + count * weight);
    }
  };
  addAll(postuladoByMateria, 3);
  addAll(kb, 1);
  addAll(board, 1);
  addAll(generated, 1);

  const topMaterias = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([materia, count]) => ({ materia, count }));

  const postuladoTotal = postuladoByMateria.reduce((s, r) => s + r.count, 0);
  const demandTotal =
    kb.reduce((s, r) => s + r.count, 0) +
    board.reduce((s, r) => s + r.count, 0) +
    generated.reduce((s, r) => s + r.count, 0);
  const postuladoCoverageRatio =
    demandTotal > 0 ? Math.round((postuladoTotal / demandTotal) * 100) / 100 : 0;

  return { topMaterias, postuladoCoverageRatio };
}

/**
 * Varre bases internas (postulados, KB, lousa, conteúdos gerados) sem LLM pesado.
 */
export async function analyzeContentDatabases(): Promise<ContentIndexSummary> {
  const [totalParents, postulados, chunks, docsByMateria, postuladoByMateria, kb, board, generated] =
    await Promise.all([
      countKnowledgeDocuments(),
      countPostulados(),
      countChunks(),
      knowDocsByMateria(),
      postuladosByMateria(),
      knowledgeBaseStats(),
      boardLessonsStats(),
      generatedContentStats(),
    ]);

  const contentGaps = detectContentGaps(postuladoByMateria, [
    kb.bySubject,
    board.bySubject,
    generated.byMateria,
  ]);

  const keywordStats = buildTopMateriasKeywordStats(
    postuladoByMateria,
    kb.bySubject,
    board.bySubject,
    generated.byMateria,
  );

  return {
    scannedAt: new Date().toISOString(),
    knowledgeDocuments: {
      totalParents,
      postulados,
      chunks,
      byMateria: docsByMateria,
    },
    knowledgeBase: kb,
    boardLessons: board,
    generatedContent: generated,
    contentGaps,
    keywordStats,
  };
}

/** Descoberta rule-based sobre índice de conteúdo (complementa LLM no dailyLearn). */
export function buildContentIndexDescoberta(index: ContentIndexSummary): {
  descoberta: string;
  importancia: number;
} {
  const { knowledgeDocuments: kd, knowledgeBase: kb, boardLessons, generatedContent: gc } =
    index;

  if (index.contentGaps.length > 0) {
    const top = index.contentGaps.slice(0, 3).join("; ");
    return {
      descoberta: `Lacunas de conteúdo postulado: ${top}. Índice: ${kd.postulados} postulados / ${kd.totalParents} docs globais; KB ${kb.total}; lousa ${boardLessons.total}; gerados ${gc.totalActive}.`,
      importancia: index.contentGaps.length >= 3 ? 4 : 3,
    };
  }

  if (kd.postulados === 0 && kd.totalParents > 0) {
    return {
      descoberta: `Base global com ${kd.totalParents} documentos mas nenhum marcado como postulado — revisar ingestão ou metadados source=postulado.`,
      importancia: 4,
    };
  }

  return {
    descoberta: `Cobertura de conteúdo: ${kd.postulados} postulados, KB ${kb.total} (${kb.distinctUsers} usuários), ${boardLessons.ready} aulas prontas na lousa, ${gc.totalActive} materiais gerados ativos. Ratio postulado/demanda: ${index.keywordStats.postuladoCoverageRatio}.`,
    importancia: 2,
  };
}

/** Persiste descoberta estruturada do índice de conteúdo (evidência JSON rica). */
export async function persistKnowledgeIndexDescoberta(
  agentId: string,
  index: ContentIndexSummary,
  extraEvidencia: Record<string, unknown> = {},
): Promise<void> {
  const { descoberta, importancia } = buildContentIndexDescoberta(index);
  const recommendation: HermesRecommendation = {
    agentId,
    area: "conteudo/indice",
    targetSurface: "knowledge_documents/knowledge_base/board_lessons/generated_content",
    observedState: descoberta,
    evidence: JSON.stringify({
      postulados: index.knowledgeDocuments.postulados,
      docsGlobais: index.knowledgeDocuments.totalParents,
      kb: index.knowledgeBase.total,
      lousa: index.boardLessons.total,
      gerados: index.generatedContent.totalActive,
      lacunas: index.contentGaps,
    }),
    problemOpportunity:
      index.contentGaps.length > 0
        ? "Existem materias com demanda interna e pouca cobertura de postulados."
        : "A cobertura precisa continuar monitorada para evitar lacunas futuras.",
    recommendedChange:
      index.contentGaps.length > 0
        ? `Priorizar ingestao ou curadoria das lacunas: ${index.contentGaps.slice(0, 4).join("; ")}.`
        : "Manter monitoramento do ratio postulado/demanda e qualidade dos materiais gerados.",
    expectedImpact: "Melhorar grounding pedagogico e reduzir respostas sem base suficiente.",
    confidence: index.contentGaps.length > 0 || index.knowledgeDocuments.postulados === 0 ? "alta" : "media",
    successMetric: "Aumento do ratio postulado/demanda e reducao de contentGaps.",
    implementationNotes: "Atualizar ingestao/metadados source=postulado antes de ampliar geracao.",
  };
  await persistDescoberta(
    agentId,
    descoberta,
    {
      kind: "content_index",
      contentIndex: index,
      recommendation,
      ...extraEvidencia,
    },
    importancia,
  );
}

export function isContentGapDescoberta(descoberta: string, evidencia: unknown): boolean {
  const blob = `${descoberta} ${JSON.stringify(evidencia ?? {})}`.toLowerCase();
  if (evidencia && typeof evidencia === "object" && (evidencia as Record<string, unknown>).kind === "content_index") {
    return true;
  }
  return GAP_KEYWORDS.some((kw) => blob.includes(kw));
}
