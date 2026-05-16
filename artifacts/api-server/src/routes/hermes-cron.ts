import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { initHermes } from "../lib/hermes/bootstrap";
import { agentRegistry } from "../lib/hermes/agentRegistry";
import { setHermesCronHint } from "../lib/hermes/cronState";

initHermes();

/**
 * Endpoints internos chamados pelo Railway Cron. Vivem FORA do prefixo /api
 * para escapar do `clerkMiddleware()` montado lá. Autenticação é feita pelo
 * header `x-cron-secret` comparado a `process.env.HERMES_CRON_SECRET`.
 */
function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.HERMES_CRON_SECRET;
  if (!expected) {
    console.error("[hermes/cron] HERMES_CRON_SECRET não configurado no ambiente");
    res.status(500).json({ erro: "Cron secret não configurado" });
    return;
  }
  const provided = String(req.headers["x-cron-secret"] ?? "");
  if (provided !== expected) {
    res.status(401).json({ erro: "Cron secret inválido" });
    return;
  }
  next();
}

const router: IRouter = Router();

router.post("/internal/hermes/daily-learn", requireCronSecret, async (_req: Request, res: Response) => {
  const ran: string[] = [];
  const errors: Array<{ agent: string; message: string }> = [];

  for (const agent of agentRegistry.list()) {
    if (!agent.dailyLearn) continue;
    try {
      await agent.dailyLearn();
      ran.push(agent.id);
    } catch (err: any) {
      console.error(`[hermes/cron] dailyLearn '${agent.id}' falhou:`, err);
      errors.push({ agent: agent.id, message: err?.message ?? String(err) });
    }
  }

  setHermesCronHint({
    job: "daily-learn",
    finishedAt: new Date().toISOString(),
    ran,
    ok: errors.length === 0,
    errorCount: errors.length,
  });

  res.json({ ok: errors.length === 0, ran, errors });
});

router.post("/internal/hermes/hourly-proactive", requireCronSecret, async (_req: Request, res: Response) => {
  const ran: string[] = [];
  const errors: Array<{ agent: string; message: string }> = [];

  for (const agent of agentRegistry.list()) {
    if (!agent.proactive) continue;
    try {
      await agent.proactive();
      ran.push(agent.id);
    } catch (err: any) {
      console.error(`[hermes/cron] proactive '${agent.id}' falhou:`, err);
      errors.push({ agent: agent.id, message: err?.message ?? String(err) });
    }
  }

  // Drena fila Hermes (tarefas assíncronas). Opcional no Railway: agende também
  // POST /internal/hermes/process-tasks a cada 5–15 min (mesmo x-cron-secret) para
  // processar mais rápido sem depender só deste hourly.
  let processTasks = { claimed: 0, completed: 0, failed: 0, errors: [] as string[] };
  try {
    const { processNextTasks } = await import("../lib/hermes/tasks/queue");
    processTasks = await processNextTasks(5);
  } catch (err: any) {
    console.error("[hermes/cron] processNextTasks (inline hourly) falhou:", err);
    processTasks.errors.push(err?.message ?? String(err));
  }

  setHermesCronHint({
    job: "hourly-proactive",
    finishedAt: new Date().toISOString(),
    ran,
    ok: errors.length === 0,
    errorCount: errors.length,
  });

  res.json({
    ok: errors.length === 0,
    ran,
    errors,
    processTasks,
  });
});

router.post("/internal/hermes/process-tasks", requireCronSecret, async (req: Request, res: Response) => {
  const raw =
    (req.body as { limit?: unknown } | undefined)?.limit ??
    (typeof req.query.limit === "string" ? req.query.limit : undefined);
  const n = Math.min(50, Math.max(1, Number(raw) || 5));
  try {
    const { processNextTasks } = await import("../lib/hermes/tasks/queue");
    const out = await processNextTasks(n);
    res.json({ ok: out.failed === 0, ...out });
  } catch (err: any) {
    console.error("[hermes/cron] process-tasks:", err);
    res.status(500).json({ ok: false, erro: err?.message ?? String(err) });
  }
});

export default router;
