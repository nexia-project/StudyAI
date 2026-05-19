/**
 * Pedagogia e conteúdos — catálogo e status de ingestão (admin).
 *
 * GET /api/pedagogy/catalog     — índice pedagógico (postulados, lacunas, BNCC/ENEM/RAG)
 * GET /api/pedagogy/ingestion-status — resumo operacional para ingestão de postulados
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../lib/hermes/requireAdmin";
import { analyzeContentDatabases } from "../lib/hermes/jobs/knowledge-index";
import {
  PREMIUM_MATERIAL_STANDARD_SUMMARY,
  PREMIUM_MATERIAL_STATUS_GUIDE,
} from "../lib/pedagogy/premium-material-standard";
import { ALL_PROVIDERS, PROVIDERS } from "../lib/external-rag/aggregate.js";

const router: IRouter = Router();

const EXTERNAL_CONNECTORS = [
  {
    id: "enem-api",
    label: "ENEM (api.enem.dev)",
    status: "implemented",
    paths: ["ingest:enem", "ingest:enem-db", "GET /api/enem-bank/*"],
    config: ["ENEM_BANK_SOURCE", "ENEM_BANK_JSON_PATH", "DATABASE_URL"],
  },
  {
    id: "bncc",
    label: "BNCC Ensino Médio (seed local)",
    status: "implemented",
    paths: ["GET /api/bncc/areas", "GET /api/bncc/competencias", "POST /api/bncc/align"],
    config: [],
  },
  {
    id: "semantic-scholar",
    label: "Semantic Scholar",
    status: "implemented",
    paths: ["POST /api/rag/external-search", "POST /api/rag/external-multi"],
    config: ["SEMANTIC_SCHOLAR_API_KEY (opcional)"],
  },
  {
    id: "rag-multi",
    label: "RAG multi-fonte",
    status: "implemented",
    paths: ["GET /api/rag/providers", "POST /api/rag/external-multi"],
    config: ["providers: " + ALL_PROVIDERS.join(", ")],
  },
  {
    id: "bncc-official-api",
    label: "BNCC API oficial MEC",
    status: "missing",
    note: "Hoje usa seed estático em lib/bncc/data.ts; integração HTTP futura na Fase B.",
  },
  {
    id: "inep-microdata",
    label: "INEP microdados",
    status: "missing",
    note: "Planejado para alinhamento ENEM/SAEB em lote futuro.",
  },
] as const;

async function postuladosPremiumBreakdown(): Promise<{
  total: number;
  byQualityStatus: Record<string, number>;
  belowPremiumThreshold: number;
}> {
  try {
    const res = await db.execute(sql`
      SELECT
        COALESCE(metadata->'quality'->>'status', metadata->>'quality_status', 'sem_score') AS status,
        COUNT(*)::int AS count
      FROM knowledge_documents
      WHERE (is_chunk = false OR is_chunk IS NULL)
        AND (
          metadata->>'source' = 'postulado'
          OR 'postulado' = ANY(COALESCE(tags, '{}'))
          OR source_file LIKE 'postulado:%'
        )
      GROUP BY 1
    `);
    const byQualityStatus: Record<string, number> = {};
    let total = 0;
    for (const row of res.rows as Array<{ status: string; count: number }>) {
      byQualityStatus[row.status] = row.count;
      total += row.count;
    }
    const below =
      (byQualityStatus.rascunho ?? 0) +
      (byQualityStatus.precisa_revisao ?? 0) +
      (byQualityStatus.bloqueado ?? 0) +
      (byQualityStatus.sem_score ?? 0);
    return { total, byQualityStatus, belowPremiumThreshold: below };
  } catch {
    return { total: 0, byQualityStatus: {}, belowPremiumThreshold: 0 };
  }
}

router.get("/catalog", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const [contentIndex, premiumStats] = await Promise.all([
    analyzeContentDatabases(),
    postuladosPremiumBreakdown(),
  ]);

  res.json({
    ok: true,
    scannedAt: contentIndex.scannedAt,
    premiumMaterialStandard: PREMIUM_MATERIAL_STANDARD_SUMMARY,
    qualityStatusGuide: PREMIUM_MATERIAL_STATUS_GUIDE,
    contentIndex,
    postulados: {
      ...contentIndex.knowledgeDocuments,
      premiumQuality: premiumStats,
    },
    externalConnectors: EXTERNAL_CONNECTORS,
    ragProviders: PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      freeApiKey: p.freeApiKey,
      language: p.language,
    })),
    hermesAgents: ["auditor_pedagogico", "content_gap_cqo_avancado", "qa_sintetico"],
    ingestCommands: {
      postuladosCqo: `pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --skip-existing`,
      dryRun: `pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --dry-run`,
    },
    docs: [
      "docs/pedagogia-conteudos-roadmap.md",
      "docs/padrao-material-pedagogico-premium.md",
      "docs/INGEST-POSTULADOS-ENEM.md",
    ],
  });
});

router.get("/ingestion-status", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const contentIndex = await analyzeContentDatabases();
  const premiumStats = await postuladosPremiumBreakdown();

  const cqoSeeds = [
    "Artigo, Pronome e Numeral",
    "Português - Texto Científico e Fotossíntese",
    "Subtração com Recursos e Compensação",
  ];
  const postuladoMaterias = new Set(
    (
      await db.execute(sql`
        SELECT DISTINCT COALESCE(NULLIF(TRIM(subject), ''), metadata->>'materia', metadata->>'topic') AS m
        FROM knowledge_documents
        WHERE (is_chunk = false OR is_chunk IS NULL)
          AND (
            metadata->>'source' = 'postulado'
            OR source_file LIKE 'postulado:%'
          )
      `)
    ).rows.map((r) => String((r as { m: string }).m ?? "").trim()),
  );

  const cqoSeedStatus = cqoSeeds.map((topic) => ({
    topic,
    ingested: [...postuladoMaterias].some(
      (m) => m.toLowerCase().includes(topic.slice(0, 12).toLowerCase()) || topic.toLowerCase().includes(m.toLowerCase()),
    ),
  }));

  res.json({
    ok: true,
    scannedAt: contentIndex.scannedAt,
    summary: {
      postuladosTotal: contentIndex.knowledgeDocuments.postulados,
      contentGaps: contentIndex.contentGaps,
      postuladoCoverageRatio: contentIndex.keywordStats.postuladoCoverageRatio,
      premiumStats,
    },
    cqoSeedStatus,
    readyForIngest: contentIndex.knowledgeDocuments.postulados < 3,
    recommendedCommand:
      "pnpm --filter @workspace/api-server run ingest:postulados -- \"./docs/postulados-cqo\" --uploaded-by=<UUID_ADMIN> --skip-existing",
    resolveAdminUuid:
      "SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 5;",
  });
});

export default router;
