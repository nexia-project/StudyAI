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

const app: Express = express();

// ── Trust proxy (Replit / Cloudflare sit in front) ──────────────────────────
app.set("trust proxy", 1);

// ── HTTP Security Headers (helmet) ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS — only allow the production domain + dev environment ────────────────
const ALLOWED_ORIGINS = new Set([
  "https://study.ia.br",
  "https://www.study.ia.br",
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000", "http://localhost:18459", "http://localhost:5173"] : []),
]);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
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
app.use("/api", generalLimiter);

// ── Optional auth: sets req.userId for authenticated requests ─────────────────
app.use(optionalAuth);

app.use("/api", router);
app.use("/api", subscriptionWebhookRouter);

export default app;
