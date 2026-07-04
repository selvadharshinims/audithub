import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { mailer } from "../lib/mailer.js";
import { push } from "../lib/push.js";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/**
 * Scan active reminders and dispatch one per matching (reminderId, offset, channel)
 * on the day (dueDate - offset days) falls on today. Idempotent via the unique
 * ReminderDispatch constraint.
 */
export async function runReminderSweep(
  now: Date = new Date(),
): Promise<{ dispatched: number; skipped: number }> {
  const today = startOfDay(now);
  const horizon = new Date(today.getTime() + 30 * DAY);

  const reminders = await prisma.reminder.findMany({
    where: { active: true, dueDate: { gte: today, lte: horizon } },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          orgId: true,
          org: {
            select: {
              id: true,
              name: true,
              users: {
                where: { isActive: true },
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      },
      dispatches: true,
    },
  });

  let dispatched = 0;
  let skipped = 0;

  for (const r of reminders) {
    const daysAway = Math.round((startOfDay(r.dueDate).getTime() - today.getTime()) / DAY);
    if (!r.offsets.includes(daysAway)) continue;

    if (r.dispatches.some((d) => d.offset === daysAway && d.channel === r.channel)) {
      skipped++;
      continue;
    }

    const result = await dispatchReminder(r, daysAway);
    if (result.ok) dispatched++;
  }

  logger.info({ dispatched, skipped }, "reminder sweep complete");
  return { dispatched, skipped };
}

type ReminderWithRelations = Awaited<ReturnType<typeof loadReminderForDispatch>>;

async function loadReminderForDispatch(reminderId: string) {
  return prisma.reminder.findUniqueOrThrow({
    where: { id: reminderId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          orgId: true,
          org: {
            select: {
              id: true,
              name: true,
              users: {
                where: { isActive: true },
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Dispatch a single reminder for a specific offset (or 0 for "now").
 * Records the dispatch and creates in-app notifications + activity log.
 */
export async function dispatchReminder(
  reminder: ReminderWithRelations | (ReminderWithRelations & { dispatches?: unknown }),
  offset: number,
): Promise<{ ok: boolean; error?: string }> {
  const subject = buildSubject(reminder, offset);
  const body = buildBody(reminder, offset);

  try {
    if (reminder.channel === "email") {
      const recipients = [
        ...(reminder.client.email ? [reminder.client.email] : []),
        ...reminder.client.org.users.map((u) => u.email),
      ];
      for (const to of recipients) await mailer.send(to, subject, body);
    } else if (reminder.channel === "push") {
      for (const u of reminder.client.org.users) {
        await push.send(u.id, { title: subject, body });
      }
    } else {
      logger.warn({ channel: reminder.channel, reminderId: reminder.id }, "reminder: unsupported channel");
    }

    await prisma.reminderDispatch.create({
      data: { reminderId: reminder.id, offset, channel: reminder.channel, status: "sent" },
    });

    await prisma.notification.createMany({
      data: reminder.client.org.users.map((u) => ({
        userId: u.id,
        title: subject,
        body,
        link: `/clients/${reminder.client.id}`,
      })),
    });

    await prisma.activityLog.create({
      data: {
        orgId: reminder.client.orgId,
        action: "reminder.sent",
        entity: "Reminder",
        entityId: reminder.id,
        meta: { offset, channel: reminder.channel },
      },
    });

    return { ok: true };
  } catch (err) {
    logger.error({ err, reminderId: reminder.id }, "reminder dispatch failed");
    await prisma.reminderDispatch
      .create({
        data: {
          reminderId: reminder.id,
          offset,
          channel: reminder.channel,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        },
      })
      .catch(() => undefined);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Load a reminder and dispatch it now for offset 0 — used by the send-now endpoint. */
export async function sendReminderNow(reminderId: string): Promise<{ ok: boolean; error?: string }> {
  const reminder = await loadReminderForDispatch(reminderId);
  return dispatchReminder(reminder, 0);
}

function buildSubject(
  r: { type: string; title: string | null; client: { name: string } },
  days: number,
): string {
  const when = days === 0 ? "due today" : days === 1 ? "due tomorrow" : `due in ${days} days`;
  const label = r.title ?? `${r.type} for ${r.client.name}`;
  return `[AuditHub] ${label} — ${when}`;
}

function buildBody(
  r: {
    type: string;
    title: string | null;
    dueDate: Date;
    client: { name: string };
    notes: string | null;
  },
  days: number,
): string {
  const dueLabel = r.dueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const heading = r.title ?? `${r.type} filing for ${r.client.name}`;
  const dueSuffix = days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif;">
      <h2 style="margin: 0 0 12px 0;">${escapeHtml(heading)}</h2>
      <p style="margin: 0 0 4px 0;"><strong>Client:</strong> ${escapeHtml(r.client.name)}</p>
      <p style="margin: 0 0 4px 0;"><strong>Type:</strong> ${escapeHtml(r.type)}</p>
      <p style="margin: 0 0 4px 0;"><strong>Due:</strong> ${dueLabel} (${dueSuffix})</p>
      ${r.notes ? `<p style="margin: 12px 0 0 0;">${escapeHtml(r.notes)}</p>` : ""}
      <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
      <p style="color: #888; font-size: 12px; margin: 0;">Auto-generated by AuditHub.</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}
