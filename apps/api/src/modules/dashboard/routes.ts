import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

/** India financial year: 1 April → 31 March. */
function financialYearBounds(now = new Date()): { start: Date; end: Date } {
  const y = now.getFullYear();
  const isBeforeApril = now.getMonth() < 3;
  const startYear = isBeforeApril ? y - 1 : y;
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31, 23, 59, 59, 999),
  };
}

dashboardRouter.get("/", async (req, res, next) => {
  try {
    const orgId = req.auth!.orgId;
    const now = new Date();
    const fy = financialYearBounds(now);
    const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      totalClients,
      openTasks,
      overdueInvoicesCount,
      completedTasks30d,
      outstandingAgg,
      revenueRows,
      taskStatusRows,
      invoicesForCharts,
      clientsForGrowth,
      upcomingReminders,
      recentActivity,
    ] = await Promise.all([
      prisma.client.count({ where: { orgId } }),
      prisma.task.count({
        where: {
          status: { not: "done" },
          OR: [{ client: { orgId } }, { assignee: { orgId } }],
        },
      }),
      prisma.invoice.count({
        where: { client: { orgId }, status: "overdue" },
      }),
      prisma.task.count({
        where: {
          status: "done",
          updatedAt: { gte: past30 },
          OR: [{ client: { orgId } }, { assignee: { orgId } }],
        },
      }),
      prisma.invoice.aggregate({
        where: { client: { orgId }, status: { in: ["pending", "partial", "overdue"] } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { client: { orgId }, status: "paid", issuedAt: { gte: fy.start, lte: fy.end } },
        _sum: { total: true },
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: { OR: [{ client: { orgId } }, { assignee: { orgId } }] },
        _count: { _all: true },
      }),
      prisma.invoice.findMany({
        where: { client: { orgId }, issuedAt: { gte: twelveMonthsAgo } },
        select: { total: true, status: true, issuedAt: true },
      }),
      prisma.client.findMany({
        where: { orgId, createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
      prisma.reminder.findMany({
        where: {
          client: { orgId },
          active: true,
          dueDate: { gte: now, lte: next30 },
        },
        include: { client: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: { orgId },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);

    const revenueByMonth = bucketByMonth(twelveMonthsAgo, now, (bucket) => {
      let revenue = 0;
      let billed = 0;
      for (const inv of invoicesForCharts) {
        const d = inv.issuedAt;
        if (sameMonth(d, bucket.date)) {
          billed += Number(inv.total);
          if (inv.status === "paid") revenue += Number(inv.total);
        }
      }
      return { label: bucket.label, revenue, billed };
    });

    let running = await prisma.client.count({
      where: { orgId, createdAt: { lt: twelveMonthsAgo } },
    });
    const clientsByMonth = bucketByMonth(twelveMonthsAgo, now, (bucket) => {
      const created = clientsForGrowth.filter((c) => sameMonth(c.createdAt, bucket.date)).length;
      running += created;
      return { label: bucket.label, total: running, added: created };
    });

    res.json({
      kpis: {
        totalClients,
        openTasks,
        overdueInvoices: overdueInvoicesCount,
        completedTasks30d,
        outstandingDues: Number(outstandingAgg._sum.total ?? 0),
        revenueFY: Number(revenueRows._sum.total ?? 0),
      },
      revenueByMonth,
      clientsByMonth,
      taskStatusCounts: taskStatusRows.map((r) => ({ status: r.status, count: r._count._all })),
      upcomingReminders,
      recentActivity,
      meta: {
        financialYear: {
          start: fy.start.toISOString(),
          end: fy.end.toISOString(),
        },
        generatedAt: now.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

function bucketByMonth<T>(from: Date, to: Date, mapper: (b: { date: Date; label: string }) => T): T[] {
  const buckets: T[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  const fmt = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" });
  while (cursor <= end) {
    buckets.push(mapper({ date: new Date(cursor), label: fmt.format(cursor) }));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
