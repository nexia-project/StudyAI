import app from "./app";
import { logger } from "./lib/logger";
import { ensureAllSchemas } from "./lib/ensureSchema";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Guard against unhandled rejections/exceptions crashing the process ────────
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection — keeping process alive");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException — keeping process alive");
});

// ── Garante tabelas no boot (uma vez só, não por request) ─────────────────────
ensureAllSchemas().catch((err) => {
  logger.error({ err }, "[boot] ensureAllSchemas failed — continuing anyway");
});

const server = app.listen(port, () => {
  logger.info({ pid: process.pid, hostname: "localhost", port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});

// ── Graceful shutdown on SIGTERM (sent by Replit during deploys) ──────────────
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down gracefully");
  server.close(() => {
    logger.info("All connections closed, process exiting");
    process.exit(0);
  });
  // Force exit after 10 seconds if connections don't close
  setTimeout(() => {
    logger.warn("Forced exit after 10s graceful shutdown timeout");
    process.exit(0);
  }, 10_000).unref();
});
