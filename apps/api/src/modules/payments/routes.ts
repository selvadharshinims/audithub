import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { PaymentCreateSchema, PaymentUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";
import { recomputeInvoiceStatus } from "./service.js";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

paymentsRouter.get("/", async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { invoice: { client: { orgId: req.auth!.orgId } } },
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            total: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post("/", async (req, res, next) => {
  try {
    const input = PaymentCreateSchema.parse(req.body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    const created = await prisma.payment.create({ data: input });
    await recomputeInvoiceStatus(input.invoiceId);

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.get("/:id", async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, invoice: { client: { orgId: req.auth!.orgId } } },
      include: {
        invoice: {
          select: { id: true, number: true, total: true, client: { select: { id: true, name: true } } },
        },
      },
    });
    if (!payment) throw new HttpError(404, "Payment not found");
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = PaymentUpdateSchema.parse(req.body);

    const existing = await prisma.payment.findFirst({
      where: { id: req.params.id, invoice: { client: { orgId: req.auth!.orgId } } },
      select: { id: true, invoiceId: true },
    });
    if (!existing) throw new HttpError(404, "Payment not found");

    const updated = await prisma.payment.update({ where: { id: existing.id }, data: input });
    await recomputeInvoiceStatus(existing.invoiceId);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.payment.findFirst({
      where: { id: req.params.id, invoice: { client: { orgId: req.auth!.orgId } } },
      select: { id: true, invoiceId: true },
    });
    if (!existing) throw new HttpError(404, "Payment not found");

    await prisma.payment.delete({ where: { id: existing.id } });
    await recomputeInvoiceStatus(existing.invoiceId);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
