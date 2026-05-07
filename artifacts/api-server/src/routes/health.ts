import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY);
  const hasOpenRouter = !!(process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY);
  res.json({
    ...data,
    v: "fix-vision-voice-v2",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    keys: { openai: hasOpenAI, openrouter: hasOpenRouter },
  });
});

export default router;
