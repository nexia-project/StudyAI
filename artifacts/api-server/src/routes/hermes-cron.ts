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

  setHermesCronHint({
    job: "hourly-proactive",
    finishedAt: new Date().toISOString(),
    ran,
    ok: errors.length === 0,
    errorCount: errors.length,
  });

  res.json({ ok: errors.length === 0, ran, errors });
});

export default router;
