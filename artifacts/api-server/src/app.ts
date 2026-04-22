import express, { type Express } from "express";
import cors from "cors";
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

const app: Express = express();

// ── CRITICAL: Health check MUST respond before any other middleware ───────────
// This ensures the health check never fails due to Clerk, rate-limiter or DB.
app.get("/api/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
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
app.use("/api", generalLimiter);

// ── Optional auth: sets req.userId for authenticated requests ─────────────────
app.use(optionalAuth);

// ── Activity tracking: fire-and-forget, records logins + daily activity ───────
app.use(trackActivity);

app.use("/api", router);
app.use("/api", subscriptionWebhookRouter);

export default app;
