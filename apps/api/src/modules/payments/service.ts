import { prisma } from "../../lib/prisma.js";

/**
 * Recomputes an invoice's status from the sum of its "paid" payments.
 *  - Fully covered  → paid
 *  - Partially paid → partial
 *  - Nothing paid, past due date → overdue
 *  - Otherwise      → pending
 */
export async function recomputeInvoiceStatus(invoiceId: string): Promise<void> {
  const [invoice, paidAgg] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: invoiceId }, select: { total: true, dueDate: true } }),
    prisma.payment.aggregate({
      where: { invoiceId, status: "paid" },
      _sum: { amount: true },
    }),
  ]);
  if (!invoice) return;

  const paidTotal = Number(paidAgg._sum.amount ?? 0);
  const invoiceTotal = Number(invoice.total);

  let status: "paid" | "partial" | "pending" | "overdue";
  if (invoiceTotal > 0 && paidTotal >= invoiceTotal) status = "paid";
  else if (paidTotal > 0) status = "partial";
  else if (invoice.dueDate && invoice.dueDate < new Date()) status = "overdue";
  else status = "pending";

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
}
