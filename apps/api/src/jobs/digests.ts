import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { mailer } from "../lib/mailer.js";

const DAY = 24 * 60 * 60 * 1000;

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

interface OrgSummary {
  orgId: string;
  orgName: string;
  totalClients: number;
  openTasks: number;
  overdueInvoices: number;
  outstandingDues: number;
  upcomingDeadlines: Array<{
    title: string;
    clientName: string;
    dueDate: Date;
    type: string;
  }>;
  overdueInvoiceRows: Array<{ number: string; clientName: string; total: number; dueDate: Date | null }>;
}

async function buildOrgSummary(orgId: string, orgName: string, now: Date): Promise<OrgSummary> {
  const in7 = new Date(now.getTime() + 7 * DAY);

  const [totalClients, openTasks, overdueInvoicesCount, outstandingAgg, deadlines, overdueRows] =
    await Promise.all([
      prisma.client.count({ where: { orgId } }),
      prisma.task.count({
        where: {
          status: { not: "done" },
          OR: [{ client: { orgId } }, { assignee: { orgId } }],
        },
      }),
      prisma.invoice.count({ where: { client: { orgId }, status: "overdue" } }),
      prisma.invoice.aggregate({
        where: { client: { orgId }, status: { in: ["pending", "partial", "overdue"] } },
        _sum: { total: true },
      }),
      prisma.reminder.findMany({
        where: { active: true, client: { orgId }, dueDate: { gte: now, lte: in7 } },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
      prisma.invoice.findMany({
        where: { client: { orgId }, status: "overdue" },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 8,
      }),
    ]);

  return {
    orgId,
    orgName,
    totalClients,
    openTasks,
    overdueInvoices: overdueInvoicesCount,
    outstandingDues: Number(outstandingAgg._sum.total ?? 0),
    upcomingDeadlines: deadlines.map((d) => ({
      title: d.title ?? `${d.type} filing`,
      clientName: d.client.name,
      dueDate: d.dueDate,
      type: d.type,
    })),
    overdueInvoiceRows: overdueRows.map((r) => ({
      number: r.number,
      clientName: r.client.name,
      total: Number(r.total),
      dueDate: r.dueDate,
    })),
  };
}

function renderDigestHtml(summary: OrgSummary, dateLabel: string): string {
  const kpiCard = (label: string, value: string) =>
    `<td style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; text-align: center;">
       <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(label)}</div>
       <div style="margin-top: 4px; font-size: 20px; font-weight: 700; color: #111827;">${escapeHtml(value)}</div>
     </td>`;

  const deadlinesList =
    summary.upcomingDeadlines.length === 0
      ? '<p style="color: #666;">Nothing due in the next 7 days.</p>'
      : `<ul style="padding-left: 18px; margin: 0;">${summary.upcomingDeadlines
          .map(
            (d) =>
              `<li style="margin-bottom: 4px;"><strong>${escapeHtml(d.type)}</strong> · ${escapeHtml(d.title)} — ${escapeHtml(d.clientName)} on <strong>${d.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</strong></li>`,
          )
          .join("")}</ul>`;

  const overdueList =
    summary.overdueInvoiceRows.length === 0
      ? '<p style="color: #666;">No overdue invoices.</p>'
      : `<ul style="padding-left: 18px; margin: 0;">${summary.overdueInvoiceRows
          .map(
            (r) =>
              `<li style="margin-bottom: 4px;"><strong>${escapeHtml(r.number)}</strong> · ${escapeHtml(r.clientName)} — <strong>${inr.format(r.total)}</strong>${r.dueDate ? ` (due ${r.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })})` : ""}</li>`,
          )
          .join("")}</ul>`;

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h1 style="margin: 0 0 4px; font-size: 20px; color: #111827;">${escapeHtml(summary.orgName)}</h1>
      <p style="margin: 0 0 20px; color: #666; font-size: 13px;">Daily digest · ${dateLabel}</p>

      <table style="width: 100%; border-collapse: separate; border-spacing: 6px; margin-bottom: 20px;">
        <tr>
          ${kpiCard("Clients", String(summary.totalClients))}
          ${kpiCard("Open tasks", String(summary.openTasks))}
          ${kpiCard("Overdue invoices", String(summary.overdueInvoices))}
          ${kpiCard("Outstanding", inr.format(summary.outstandingDues))}
        </tr>
      </table>

      <h2 style="margin: 24px 0 8px; font-size: 15px; color: #111827;">Upcoming deadlines (next 7 days)</h2>
      ${deadlinesList}

      <h2 style="margin: 24px 0 8px; font-size: 15px; color: #111827;">Overdue invoices</h2>
      ${overdueList}

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
      <p style="margin: 0; color: #888; font-size: 12px;">Auto-generated by AuditHub every morning at 08:00.</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

/** Send the digest to every active user in every org. */
export async function runDailyDigest(now: Date = new Date()): Promise<{ orgs: number; emails: number }> {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      users: {
        where: { isActive: true },
        select: { id: true, email: true, name: true },
      },
    },
  });

  const dateLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  let emails = 0;

  for (const org of orgs) {
    if (org.users.length === 0) continue;

    const summary = await buildOrgSummary(org.id, org.name, now);
    const html = renderDigestHtml(summary, dateLabel);
    const subject = `[AuditHub] ${org.name} — Daily digest ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;

    for (const user of org.users) {
      try {
        await mailer.send(user.email, subject, html);
        emails++;
      } catch (err) {
        logger.error({ err, userId: user.id }, "digest email failed");
      }
    }

    await prisma.activityLog.create({
      data: {
        orgId: org.id,
        action: "digest.sent",
        entity: "Organization",
        entityId: org.id,
        meta: { recipients: org.users.length },
      },
    });
  }

  logger.info({ orgs: orgs.length, emails }, "daily digest complete");
  return { orgs: orgs.length, emails };
}

/** Send the digest for just one org (used by the test endpoint). */
export async function sendDigestForOrg(orgId: string, now: Date = new Date()): Promise<{ emails: number }> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      users: { where: { isActive: true }, select: { id: true, email: true, name: true } },
    },
  });
  if (!org) throw new Error("Organization not found");

  const summary = await buildOrgSummary(org.id, org.name, now);
  const html = renderDigestHtml(
    summary,
    now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
  );
  const subject = `[AuditHub] ${org.name} — Daily digest ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;

  let emails = 0;
  for (const user of org.users) {
    try {
      await mailer.send(user.email, subject, html);
      emails++;
    } catch (err) {
      logger.error({ err, userId: user.id }, "digest email failed");
    }
  }

  await prisma.activityLog.create({
    data: {
      orgId: org.id,
      action: "digest.sent",
      entity: "Organization",
      entityId: org.id,
      meta: { recipients: org.users.length, manual: true },
    },
  });

  return { emails };
}
