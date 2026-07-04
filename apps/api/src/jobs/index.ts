import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { runReminderSweep } from "./reminders.js";
import { runDailyDigest } from "./digests.js";

export function startJobs() {
  cron.schedule("0 * * * *", async () => {
    logger.info("cron: reminder sweep");
    await runReminderSweep().catch((err) => logger.error({ err }, "reminder sweep failed"));
  });

  cron.schedule("0 8 * * *", async () => {
    logger.info("cron: daily digest");
    await runDailyDigest().catch((err) => logger.error({ err }, "daily digest failed"));
  });
}
