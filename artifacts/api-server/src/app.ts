import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import subscriptionWebhookRouter from "./routes/subscriptionWebhook";
import { logger } from "./lib/logger";
import { optionalAuth } from "./middlewares/requireAuth";
import { clerkProxyMiddleware, CLERK_PROXY_PATH } from "./middlewares/clerkProxyMiddleware";
import { sanitizeInputs } from "./middlewares/security";
import { trackActivity } from "./middlewares/trackActivity";
import { userRateLimit } from "./middlewares/userRateLimit";

const app: Express = express();

// ── CRITICAL: Health check MUST respond before any other middleware ───────────
// This ensures the health check never fails due to Clerk, rate-limiter or DB.
app.get("/api/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    v: "fix-vision-voice-v3",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    keys: {
      openai:    !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY   ?? process.env.OPENAI_API_KEY),
      openrouter: !!(process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY),
      clerk:      !!(process.env.CLERK_SECRET_KEY),
      db:         !!(process.env.DATABASE_URL),
    },
  });
});

// ── Trust proxy (Replit / Cloudflare sit in front) ──────────────────────────
app.set("trust proxy", 1);

// ── HTTP Security Headers (helmet) ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS — allow production domains + Replit domains + dev environment ────────
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  // Custom production domains
  if (origin === "https://study.ia.br" || origin === "https://www.study.ia.br") return true;
  // Railway domains
  if (origin.endsWith(".railway.app") || origin.endsWith(".up.railway.app")) return true;
  // Any Replit-hosted domain (*.replit.app, *.replit.dev, *.janeway.replit.dev)
  if (origin.endsWith(".replit.app") || origin.endsWith(".replit.dev")) return true;
  // Dev domain injected by Replit at runtime
  if (process.env.REPLIT_DEV_DOMAIN && origin === `https://${process.env.REPLIT_DEV_DOMAIN}`) return true;
  // Local development
  if (process.env.NODE_ENV === "development") {
    if (origin.startsWith("http://localhost:")) return true;
  }
  return false;
}

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin not allowed — ${origin}`));
      }
    },
  }),
);

// ── Clerk proxy (must be BEFORE body parsers) ─────────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ── Clerk middleware ─────────────────────────────────────────────────────────
app.use(clerkMiddleware());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── Stripe webhook: raw body parser ONLY on exact webhook path ───────────────
app.use("/api/subscription/webhook", express.raw({ type: "*/*" }));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Input sanitization (strip null bytes, enforce field length limits) ────────
app.use(sanitizeInputs);

// ── Rate limiters ─────────────────────────────────────────────────────────────

// General API: 200 req / 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
});

// Heavy AI endpoints (plan generation, redação, simulado, voice): 30 req / 15 min per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Limite de uso da IA atingido. Aguarde alguns minutos." },
});

// Heavy generation endpoints (expensive AI calls): 10 req / 15 min per IP
const heavyAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Limite de geração de conteúdo atingido. Aguarde 15 minutos." },
});

// Auth endpoints: 20 req / 15 min per IP (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas de autenticação. Tente novamente em 15 minutos." },
});

app.use("/api/auth", authLimiter);
app.use("/api/analisar", aiLimiter);
app.use("/api/redacao", aiLimiter);
app.use("/api/simulado", aiLimiter);
app.use("/api/simulado-adaptativo", aiLimiter);
app.use("/api/flashcards", aiLimiter);
app.use("/api/voice-chat", aiLimiter);
app.use("/api/voice-proactive", aiLimiter);
app.use("/api/voice-tts", aiLimiter);
app.use("/api/resumao", aiLimiter);
app.use("/api/student/cronograma", aiLimiter);
app.use("/api/student/caderno", aiLimiter);
app.use("/api/student/sisu", aiLimiter);
app.use("/api/teacher/redacao-correct", aiLimiter);
app.use("/api/aula-ia", aiLimiter);
app.use("/api/trilha/generate", aiLimiter);
app.use("/api/notebook/chat", aiLimiter);
app.use("/api/notebook/overview", aiLimiter);
app.use("/api/notebook/study-guide", aiLimiter);
app.use("/api/notebook/flashcards", aiLimiter);
app.use("/api/notebook/questoes", aiLimiter);
app.use("/api/notebook/mapa-mental", aiLimiter);
app.use("/api/notebook/tiagao-explica", aiLimiter);

// Rotas de geração pesada (mais restritivas — chamadas de IA caras)
app.use("/api/notebook/slides", heavyAiLimiter);
app.use("/api/notebook/plano-aula", heavyAiLimiter);
app.use("/api/aula-ia/generate", heavyAiLimiter);

app.use("/api", generalLimiter);

// ── Optional auth: sets req.userId for authenticated requests ─────────────────
app.use(optionalAuth);

// ── Activity tracking: fire-and-forget, records logins + daily activity ───────
app.use(trackActivity);

// ── Per-user rate limits em endpoints de geração IA ──────────────────────────
// (após optionalAuth que resolve req.userId)
app.use("/api/voice-chat", userRateLimit(20));        // 20 msgs/15min por user
app.use("/api/voice-tts", userRateLimit(30));         // 30 TTS/15min por user
app.use("/api/aula-ia", userRateLimit(5));            // 5 aulas/15min por user
app.use("/api/notebook/slides", userRateLimit(5));    // 5 gerações/15min por user
app.use("/api/notebook/overview", userRateLimit(10)); // 10 overviews/15min por user

app.use("/api", router);
app.use("/api", subscriptionWebhookRouter);

// ── Frontend estático (Railway / produção) ────────────────────────────────────
// Em produção, serve os arquivos buildados do React.
// Em Replit dev, o frontend roda em servidor Vite separado.
if (process.env.NODE_ENV === "production") {
  const frontendDist = process.env.FRONTEND_DIST_DIR
    ?? path.resolve(process.cwd(), "artifacts/studyai/dist/public");

  app.use(express.static(frontendDist, { maxAge: "1d", etag: true }));

  // SPA fallback — qualquer rota não-API devolve index.html (Express 5: use regex)
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ── Global Error Handler — catch-all para erros não tratados ─────────────────
// DEVE ser o ÚLTIMO middleware (depois de todas as rotas)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const isOperational = statusCode < 500;

  if (!isOperational) {
    logger.error({
      err,
      method: req.method,
      url: req.url,
      userId: (req as any).userId,
      statusCode,
    }, `[UNHANDLED ERROR] ${err.message}`);
  } else {
    logger.warn({
      method: req.method,
      url: req.url,
      statusCode,
      message: err.message,
    }, `[OPERATIONAL ERROR] ${err.message}`);
  }

  // Nunca expõe stack trace em produção
  res.status(statusCode).json({
    error: isOperational ? err.message : "Erro interno do servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
