import { prisma } from "../lib/prisma.js";

/**
 * Flip past-due, unpaid invoices to `overdue`. Without this, an invoice that is
 * never paid stays `pending` forever (recomputeInvoiceStatus only runs on
 * payment events), so dashboards/digests/reports under-report overdue to ~0.
 *
 * Only `pending` (zero payments) → `overdue`, matching recomputeInvoiceStatus's
 * precedence exactly: a partially-paid invoice keeps its `partial` status.
 */
export async function runOverdueSweep(now: Date = new Date()): Promise<{ updated: number }> {
  const res = await prisma.invoice.updateMany({
    where: { status: "pending", dueDate: { not: null, lt: now } },
    data: { status: "overdue" },
  });
  return { updated: res.count };
}
