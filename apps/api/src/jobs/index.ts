import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { runReminderSweep } from "./reminders.js";
import { runDailyDigest } from "./digests.js";
import { runOverdueSweep } from "./invoices.js";

export function startJobs() {
  cron.schedule("0 * * * *", async () => {
    logger.info("cron: reminder sweep");
    await runReminderSweep().catch((err) => logger.error({ err }, "reminder sweep failed"));
    const overdue = await runOverdueSweep().catch((err) => {
      logger.error({ err }, "overdue sweep failed");
      return null;
    });
    if (overdue && overdue.updated > 0) logger.info(`overdue sweep: ${overdue.updated} invoice(s) marked overdue`);
  });

  cron.schedule("0 8 * * *", async () => {
    logger.info("cron: daily digest");
    await runDailyDigest().catch((err) => logger.error({ err }, "daily digest failed"));
  });

  // Run once on boot so existing past-due invoices are flagged immediately.
  runOverdueSweep().catch((err) => logger.error({ err }, "startup overdue sweep failed"));
}
