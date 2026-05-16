import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { hermesMemoriaInteracaoTable } from "@workspace/db/schema";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../lib/hermes/requireAdmin";
import {
  SYNTHETIC_QA_JOURNEYS,
  SYNTHETIC_QA_PERSONAS,
  runSyntheticQaAudit,
} from "../../lib/hermes/jobs/qa-sintetico";
import { PREMIUM_MATERIAL_STANDARD_SUMMARY } from "../../lib/pedagogy/premium-material-standard";

const router: IRouter = Router();

/**
 * GET /api/agents/qa_sintetico/catalogo
 * Lista personas e jornadas que o agente usa para auditoria sintética.
 */
router.get("/catalogo", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  res.json({
    ok: true,
    agent: "qa_sintetico",
    personas: SYNTHETIC_QA_PERSONAS,
    journeys: SYNTHETIC_QA_JOURNEYS,
    pedagogicalMaterialStandard: PREMIUM_MATERIAL_STANDARD_SUMMARY,
    guardrails: [
      "Não altera dados ou conteúdo de produção automaticamente.",
      "Não executa automação de navegador nesta versão.",
      "Recomendações aparecem em descobertas, ações proativas e inbox admin quando relevantes.",
    ],
  });
});

/**
 * POST /api/agents/qa_sintetico/executar-auditoria
 * Body: { periodoDias?: number, persist?: boolean, enqueueTasks?: boolean }
 */
router.post("/executar-auditoria", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const adminUserId = req.userId!;
  const {
    periodoDias = 7,
    persist = true,
    enqueueTasks = false,
  } = (req.body ?? {}) as {
    periodoDias?: number;
    persist?: boolean;
    enqueueTasks?: boolean;
  };

  const dias = Math.max(1, Math.min(30, Number(periodoDias) || 7));

  try {
    const result = await runSyntheticQaAudit({
      periodoDias: dias,
      persist: persist !== false,
      enqueueTasks: enqueueTasks === true,
      requestedBy: adminUserId,
    });

    await db.insert(hermesMemoriaInteracaoTable).values({
      userId: adminUserId,
      agentId: "qa_sintetico",
      contexto: `executar-auditoria:${dias}d`,
      resposta: JSON.stringify({
        resumo: result.resumo,
        findings: result.findings.map((finding) => ({
          journeyId: finding.journeyId,
          personaId: finding.personaId,
          severity: finding.severity,
          summary: finding.summary,
          recommendation: finding.recommendation,
        })),
      }),
      metadata: {
        periodoDias: dias,
        persist: persist !== false,
        enqueueTasks: enqueueTasks === true,
        snapshotGeneratedAt: result.snapshot.generatedAt,
      },
    });

    res.json({
      ok: true,
      agent: "qa_sintetico",
      periodoDias: dias,
      persisted: persist !== false,
      enqueueTasks: enqueueTasks === true,
      resumo: result.resumo,
      findings: result.findings,
      snapshot: {
        generatedAt: result.snapshot.generatedAt,
        platformMetrics: result.snapshot.platformMetrics,
        contentGaps: result.snapshot.contentIndex.contentGaps,
        pedagogicalMaterialStandard: result.snapshot.pedagogicalMaterialStandard,
        tableSignals: result.snapshot.tableSignals,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hermes/qa_sintetico] /executar-auditoria error:", err);
    res.status(500).json({ erro: "Falha ao executar QA sintético", _debug: message });
  }
});

export default router;
