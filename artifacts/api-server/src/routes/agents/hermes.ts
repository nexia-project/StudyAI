import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  hermesAcoesProativasTable,
  hermesAdminInboxTable,
  hermesDescobertasGlobaisTable,
  hermesTarefasTable,
} from "@workspace/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../../middlewares/requireAuth";
import { requireAdmin } from "../../lib/hermes/requireAdmin";
import { getHermesCronHint } from "../../lib/hermes/cronState";
import type { ContentIndexSummary } from "../../lib/hermes/jobs/knowledge-index";
import { getHermesDorRealCatalog } from "../../lib/hermes/jobs/dor-real-agents";

const router: IRouter = Router();
const ACTION_CENTER_TASK_TYPE = "action_center";

const ACTION_STATUSES = new Set([
  "pending",
  "approved",
  "in_progress",
  "done",
  "dismissed",
  "blocked",
]);

const PRIORITIES = new Set(["low", "medium", "high", "critical"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item): item is string => Boolean(item));
}

function extractRecommendation(source: unknown): Record<string, unknown> | null {
  if (!isRecord(source)) return null;
  const recommendation = source.recommendation;
  return isRecord(recommendation) ? recommendation : null;
}

function extractActionCenter(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {};
  return isRecord(payload.actionCenter) ? payload.actionCenter : payload;
}

function actorFromRequest(req: Request): string {
  const user = (req as Request & { user?: { id?: string; email?: string } }).user;
  return user?.email ?? user?.id ?? "admin";
}

function normalizePriority(value: unknown): string {
  const raw = asString(value)?.toLowerCase();
  return raw && PRIORITIES.has(raw) ? raw : "medium";
}

function buildActionPayload(args: {
  sourceType: string;
  sourceId: string;
  agentId: string;
  title: string;
  body: string;
  sourcePayload: Record<string, unknown> | null;
  overrides: Record<string, unknown>;
  actor: string;
}): Record<string, unknown> {
  const recommendation = extractRecommendation(args.sourcePayload);
  const metricName =
    asString(args.overrides.metric) ??
    asString(args.overrides.successMetric) ??
    asString(recommendation?.successMetric) ??
    asString(recommendation?.metric) ??
    "";
  const actionText =
    asString(args.overrides.action) ??
    asString(recommendation?.recommendedChange) ??
    asString(args.sourcePayload?.descricao) ??
    args.body;
  const evidence =
    asString(args.overrides.evidence) ??
    asString(recommendation?.observedState) ??
    asString(recommendation?.evidence) ??
    args.body;

  return {
    actionCenter: {
      version: 1,
      title: asString(args.overrides.title) ?? args.title,
      action: actionText,
      owner: asString(args.overrides.owner) ?? asString(args.overrides.responsible) ?? "admin",
      responsible: asString(args.overrides.responsible) ?? asString(args.overrides.owner) ?? "admin",
      priority: normalizePriority(args.overrides.priority ?? recommendation?.confidence),
      dueDate: asString(args.overrides.dueDate) ?? null,
      source: {
        type: args.sourceType,
        id: args.sourceId,
        agentId: asString(recommendation?.agentId) ?? args.agentId,
      },
      module: asString(args.overrides.module) ?? asString(recommendation?.module) ?? null,
      target: asString(args.overrides.target) ?? asString(recommendation?.targetSurface) ?? null,
      evidence,
      metric: {
        name: metricName,
        baseline: asString(args.overrides.baseline) ?? null,
        followUp: asString(args.overrides.followUp) ?? null,
        followUpStatus: "not_started",
      },
      acceptanceCriteria:
        asStringArray(args.overrides.acceptanceCriteria).length > 0
          ? asStringArray(args.overrides.acceptanceCriteria)
          : asStringArray(recommendation?.acceptanceCriteria),
      recommendation,
      safeExecution: {
        executable: false,
        kind: "noop_log",
        reason: "Primeira versão: aprovação registra decisão e triagem; não altera conteúdo, billing, usuários ou produção.",
      },
      auditTrail: [
        {
          at: new Date().toISOString(),
          actor: args.actor,
          event: "created",
          note: `Criada a partir de ${args.sourceType}:${args.sourceId}`,
        },
      ],
    },
  };
}

function serializeAction(row: typeof hermesTarefasTable.$inferSelect): Record<string, unknown> {
  const payload = extractActionCenter(row.payload);
  const metric = isRecord(payload.metric) ? payload.metric : {};
  const source = isRecord(payload.source) ? payload.source : {};
  const safeExecution = isRecord(payload.safeExecution) ? payload.safeExecution : {};

  return {
    id: row.id,
    status: row.status,
    agentId: row.agentId,
    tipo: row.tipo,
    title: asString(payload.title) ?? "Ação Hermes",
    action: asString(payload.action) ?? "",
    owner: asString(payload.owner) ?? asString(payload.responsible) ?? "admin",
    responsible: asString(payload.responsible) ?? asString(payload.owner) ?? "admin",
    priority: asString(payload.priority) ?? "medium",
    dueDate: asString(payload.dueDate) ?? null,
    source,
    module: asString(payload.module) ?? null,
    target: asString(payload.target) ?? null,
    evidence: asString(payload.evidence) ?? "",
    metric: {
      name: asString(metric.name) ?? "",
      baseline: asString(metric.baseline) ?? null,
      followUp: asString(metric.followUp) ?? null,
      followUpStatus: asString(metric.followUpStatus) ?? "not_started",
    },
    acceptanceCriteria: asStringArray(payload.acceptanceCriteria),
    recommendation: isRecord(payload.recommendation) ? payload.recommendation : null,
    safeExecution: {
      executable: safeExecution.executable === true,
      kind: asString(safeExecution.kind) ?? "noop_log",
      reason: asString(safeExecution.reason) ?? "",
    },
    auditTrail: Array.isArray(payload.auditTrail) ? payload.auditTrail : [],
    resultado: row.resultado,
    erro: row.erro,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function extractContentIndex(evidencia: unknown): ContentIndexSummary | null {
  if (!evidencia || typeof evidencia !== "object") return null;
  const ev = evidencia as Record<string, unknown>;
  if (ev.kind !== "content_index") return null;
  const idx = ev.contentIndex;
  if (!idx || typeof idx !== "object") return null;
  return idx as ContentIndexSummary;
}

/**
 * GET /api/agents/hermes/status
 * Read-only monitoring snapshot for admin dashboards.
 */
router.get("/status", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [descobertas, inboxUnread, pendingAcoesRow] = await Promise.all([
      db
        .select()
        .from(hermesDescobertasGlobaisTable)
        .orderBy(desc(hermesDescobertasGlobaisTable.createdAt))
        .limit(10),
      db
        .select()
        .from(hermesAdminInboxTable)
        .where(
          and(eq(hermesAdminInboxTable.lida, false), isNull(hermesAdminInboxTable.dismissedAt)),
        )
        .orderBy(desc(hermesAdminInboxTable.createdAt))
        .limit(10),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(hermesAcoesProativasTable)
        .where(eq(hermesAcoesProativasTable.status, "pending")),
    ]);

    const unreadCountRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hermesAdminInboxTable)
      .where(
        and(eq(hermesAdminInboxTable.lida, false), isNull(hermesAdminInboxTable.dismissedAt)),
      );

    const unreadCount = Number(unreadCountRow[0]?.count ?? 0);
    const pendingAcoesCount = Number(pendingAcoesRow[0]?.count ?? 0);

    let contentIndex: ContentIndexSummary | null = null;
    for (const row of descobertas) {
      const idx = extractContentIndex(row.evidencia);
      if (idx) {
        contentIndex = idx;
        break;
      }
    }

    res.json({
      ok: true,
      descobertas,
      inbox: {
        items: inboxUnread,
        unreadCount,
      },
      pendingAcoesCount,
      lastCronHint: getHermesCronHint(),
      contentIndex,
      dorRealAgents: getHermesDorRealCatalog(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hermes] GET /status error:", err);
    res.status(500).json({ erro: "Falha ao carregar status Hermes", _debug: message });
  }
});

router.get("/actions", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));

  try {
    const rows = await db
      .select()
      .from(hermesTarefasTable)
      .where(eq(hermesTarefasTable.tipo, ACTION_CENTER_TASK_TYPE))
      .orderBy(desc(hermesTarefasTable.createdAt))
      .limit(limit);

    res.json({ ok: true, total: rows.length, items: rows.map(serializeAction) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hermes] GET /actions error:", err);
    res.status(500).json({ erro: "Falha ao listar Action Center Hermes", _debug: message });
  }
});

router.post("/actions/from-source", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const sourceType = asString(body.sourceType);
  const sourceId = asString(body.sourceId);

  if (!sourceType || !sourceId) {
    res.status(400).json({ erro: "Informe sourceType e sourceId" });
    return;
  }

  try {
    let agentId = "hermes";
    let title = "Ação Hermes";
    let sourceBody = "";
    let sourcePayload: Record<string, unknown> | null = null;

    if (sourceType === "inbox") {
      const [row] = await db
        .select()
        .from(hermesAdminInboxTable)
        .where(eq(hermesAdminInboxTable.id, sourceId))
        .limit(1);
      if (!row) {
        res.status(404).json({ erro: "Inbox item não encontrado" });
        return;
      }
      agentId = row.agentId;
      title = row.titulo;
      sourceBody = row.corpo;
      sourcePayload = isRecord(row.payload) ? row.payload : null;
    } else if (sourceType === "proactive") {
      const [row] = await db
        .select()
        .from(hermesAcoesProativasTable)
        .where(eq(hermesAcoesProativasTable.id, sourceId))
        .limit(1);
      if (!row) {
        res.status(404).json({ erro: "Ação proativa não encontrada" });
        return;
      }
      agentId = row.agentId;
      title = row.descricao.slice(0, 120) || "Ação proativa Hermes";
      sourceBody = row.descricao;
      sourcePayload = isRecord(row.payload) ? row.payload : null;
    } else if (sourceType === "discovery") {
      const [row] = await db
        .select()
        .from(hermesDescobertasGlobaisTable)
        .where(eq(hermesDescobertasGlobaisTable.id, sourceId))
        .limit(1);
      if (!row) {
        res.status(404).json({ erro: "Descoberta não encontrada" });
        return;
      }
      agentId = row.agentId;
      title = row.descoberta.slice(0, 120) || "Descoberta Hermes";
      sourceBody = row.descoberta;
      sourcePayload = isRecord(row.evidencia) ? row.evidencia : null;
    } else {
      res.status(400).json({ erro: "sourceType inválido" });
      return;
    }

    const payload = buildActionPayload({
      sourceType,
      sourceId,
      agentId,
      title,
      body: sourceBody,
      sourcePayload,
      overrides: body,
      actor: actorFromRequest(req),
    });

    const [created] = await db
      .insert(hermesTarefasTable)
      .values({
        agentId,
        tipo: ACTION_CENTER_TASK_TYPE,
        payload,
        status: "pending",
      })
      .returning();

    if (sourceType === "inbox") {
      await db.update(hermesAdminInboxTable).set({ lida: true }).where(eq(hermesAdminInboxTable.id, sourceId));
    } else if (sourceType === "proactive") {
      await db.update(hermesAcoesProativasTable).set({ status: "converted" }).where(eq(hermesAcoesProativasTable.id, sourceId));
    }

    res.json({ ok: true, item: serializeAction(created!) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hermes] POST /actions/from-source error:", err);
    res.status(500).json({ erro: "Falha ao criar tarefa Hermes", _debug: message });
  }
});

router.patch("/actions/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const status = asString(body.status);
  const actionId = asString((req.params as Record<string, unknown>).id);

  if (!actionId) {
    res.status(400).json({ erro: "Informe o id da tarefa Hermes" });
    return;
  }

  if (status && !ACTION_STATUSES.has(status)) {
    res.status(400).json({ erro: "Status inválido para Action Center" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(hermesTarefasTable)
      .where(and(eq(hermesTarefasTable.id, actionId), eq(hermesTarefasTable.tipo, ACTION_CENTER_TASK_TYPE)))
      .limit(1);

    if (!row) {
      res.status(404).json({ erro: "Tarefa Hermes não encontrada" });
      return;
    }

    const payloadRoot = isRecord(row.payload) ? row.payload : {};
    const actionCenter = { ...extractActionCenter(row.payload) };
    const metric = { ...(isRecord(actionCenter.metric) ? actionCenter.metric : {}) };
    const auditTrail = Array.isArray(actionCenter.auditTrail) ? [...actionCenter.auditTrail] : [];
    const actor = actorFromRequest(req);

    for (const key of ["owner", "responsible", "dueDate", "title", "action", "evidence"] as const) {
      if (body[key] !== undefined) actionCenter[key] = asString(body[key]) ?? null;
    }
    if (body.priority !== undefined) actionCenter.priority = normalizePriority(body.priority);
    if (body.module !== undefined) actionCenter.module = asString(body.module) ?? null;
    if (body.target !== undefined) actionCenter.target = asString(body.target) ?? null;
    if (body.baseline !== undefined) metric.baseline = asString(body.baseline) ?? null;
    if (body.followUp !== undefined) metric.followUp = asString(body.followUp) ?? null;
    if (body.followUpStatus !== undefined) metric.followUpStatus = asString(body.followUpStatus) ?? "pending";
    actionCenter.metric = metric;

    auditTrail.push({
      at: new Date().toISOString(),
      actor,
      event: status ? `status:${status}` : "updated",
      note: asString(body.note) ?? null,
    });
    actionCenter.auditTrail = auditTrail;

    const updateValues: Partial<typeof hermesTarefasTable.$inferInsert> = {
      payload: { ...payloadRoot, actionCenter },
    };
    if (status) updateValues.status = status;
    if (status === "in_progress") updateValues.startedAt = new Date();
    if (status === "done" || status === "dismissed") updateValues.completedAt = new Date();
    if (status === "approved") {
      updateValues.resultado = {
        safeExecution: {
          kind: "noop_log",
          status: "approved_logged",
          approvedAt: new Date().toISOString(),
          message: "Aprovação registrada sem executar mudança em produção.",
        },
      };
    }

    const [updated] = await db
      .update(hermesTarefasTable)
      .set(updateValues)
      .where(eq(hermesTarefasTable.id, row.id))
      .returning();

    res.json({ ok: true, item: serializeAction(updated!) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hermes] PATCH /actions/:id error:", err);
    res.status(500).json({ erro: "Falha ao atualizar tarefa Hermes", _debug: message });
  }
});

export default router;
