import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { ClientCreateSchema } from "@audithub/types";
import { prisma } from "../../lib/prisma.js";

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

clientsRouter.get("/", async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { orgId: req.auth!.orgId },
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

clientsRouter.post("/", async (req, res, next) => {
  try {
    const input = ClientCreateSchema.parse(req.body);
    const created = await prisma.client.create({
      data: { ...input, orgId: req.auth!.orgId },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

clientsRouter.get("/:id", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      include: { companies: true, documents: true },
    });
    if (!client) return res.status(404).json({ error: "Not found" });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

clientsRouter.get("/:id/finance", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!client) return res.status(404).json({ error: "Not found" });

    const invoices = await prisma.invoice.findMany({
      where: { clientId: client.id },
      include: { payments: true },
      orderBy: { issuedAt: "desc" },
    });

    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    const invoiceRows = invoices.map((inv) => {
      const total = Number(inv.total);
      const paid = inv.payments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = Math.max(0, total - paid);

      totalBilled += total;
      totalPaid += paid;
      totalOutstanding += balance;
      if (inv.status === "overdue") {
        overdueCount += 1;
        overdueAmount += balance;
      }

      return {
        id: inv.id,
        number: inv.number,
        kind: inv.kind,
        status: inv.status,
        total: inv.total,
        paid: paid.toFixed(2),
        balance: balance.toFixed(2),
        issuedAt: inv.issuedAt,
        dueDate: inv.dueDate,
      };
    });

    const payments = invoices
      .flatMap((inv) =>
        inv.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          status: p.status,
          paidAt: p.paidAt,
          reference: p.reference,
          sortAt: (p.paidAt ?? p.createdAt).getTime(),
          invoice: { id: inv.id, number: inv.number },
        })),
      )
      .sort((a, b) => b.sortAt - a.sortAt)
      .map(({ sortAt: _sortAt, ...rest }) => rest);

    res.json({
      summary: {
        invoiceCount: invoices.length,
        paymentCount: payments.length,
        totalBilled: totalBilled.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalOutstanding: totalOutstanding.toFixed(2),
        overdueCount,
        overdueAmount: overdueAmount.toFixed(2),
      },
      invoices: invoiceRows,
      payments,
    });
  } catch (err) {
    next(err);
  }
});

clientsRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = ClientCreateSchema.partial().parse(req.body);
    // Org-scope guard — never trust the path id alone (cross-tenant write otherwise).
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.client.update({ where: { id: existing.id }, data: input });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

clientsRouter.delete("/:id", async (req, res, next) => {
  try {
    // Org-scope guard — deleting a client cascades to its invoices, payments,
    // documents, companies and reminders, so this must never cross tenants.
    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.client.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
