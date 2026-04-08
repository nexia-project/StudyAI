import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import subscriptionWebhookRouter from "./routes/subscriptionWebhook";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";

const app: Express = express();

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
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

// Stripe webhook: apply raw body parser ONLY to the exact webhook path so
// express.json() works correctly on every other route (including PATCH/POST with JSON body)
app.use("/api/subscription/webhook", express.raw({ type: "*/*" }));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);
app.use("/api", subscriptionWebhookRouter);

export default app;
