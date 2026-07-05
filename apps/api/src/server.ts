import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startJobs } from "./jobs/index.js";
import { ensurePlatformAdmin } from "./lib/platform-admin.js";

const server = app.listen(env.PORT, () => {
  logger.info(`AuditHub API listening on http://localhost:${env.PORT}`);
  ensurePlatformAdmin().catch((err) => logger.error({ err }, "Platform admin bootstrap failed"));
  startJobs();
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
