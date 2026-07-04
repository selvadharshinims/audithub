import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { InvoiceCreateSchema, InvoiceUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";
import { renderInvoicePdf, renderInvoicePdfToBuffer } from "./pdf.js";
import { mailer } from "../../lib/mailer.js";

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

invoicesRouter.get("/", async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { client: { orgId: req.auth!.orgId } },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch (err) {
    next(err);
  }
});

invoicesRouter.post("/", async (req, res, next) => {
  try {
    const input = InvoiceCreateSchema.parse(req.body);

    const client = await prisma.client.findFirst({
      where: { id: input.clientId, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!client) throw new HttpError(404, "Client not found");

    const created = await prisma.invoice.create({
      data: {
        clientId: input.clientId,
        number: input.number,
        kind: input.kind,
        description: input.description,
        subtotal: input.subtotal,
        cgst: input.cgst,
        sgst: input.sgst,
        igst: input.igst,
        tax: input.tax,
        total: input.total,
        status: input.status,
        issuedAt: input.issuedAt,
        dueDate: input.dueDate,
        notes: input.notes,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

invoicesRouter.get("/:id", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      include: {
        client: { select: { id: true, name: true, gstin: true, pan: true, address: true } },
        payments: true,
      },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

invoicesRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = InvoiceUpdateSchema.parse(req.body);

    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Invoice not found");

    const updated = await prisma.invoice.update({
      where: { id: existing.id },
      data: input,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

invoicesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Invoice not found");
    await prisma.invoice.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

invoicesRouter.get("/:id/pdf", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      include: {
        client: {
          select: {
            name: true,
            gstin: true,
            pan: true,
            address: true,
            email: true,
            mobile: true,
          },
        },
      },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: req.auth!.orgId },
      select: { name: true, gstin: true },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(invoice.number)}.pdf"`,
    );

    const doc = renderInvoicePdf({
      org,
      client: invoice.client,
      invoice: {
        number: invoice.number,
        kind: invoice.kind,
        description: invoice.description,
        subtotal: Number(invoice.subtotal),
        cgst: invoice.cgst ? Number(invoice.cgst) : null,
        sgst: invoice.sgst ? Number(invoice.sgst) : null,
        igst: invoice.igst ? Number(invoice.igst) : null,
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
      },
    });
    doc.pipe(res);
  } catch (err) {
    next(err);
  }
});

invoicesRouter.post("/:id/send", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            gstin: true,
            pan: true,
            address: true,
            email: true,
            mobile: true,
          },
        },
      },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    const to = (req.body?.to as string | undefined)?.trim() || invoice.client.email;
    if (!to) throw new HttpError(400, "No recipient email — client has no email on file. Pass 'to' in the body.");

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: req.auth!.orgId },
      select: { name: true, gstin: true },
    });

    const pdfBuffer = await renderInvoicePdfToBuffer({
      org,
      client: invoice.client,
      invoice: {
        number: invoice.number,
        kind: invoice.kind,
        description: invoice.description,
        subtotal: Number(invoice.subtotal),
        cgst: invoice.cgst ? Number(invoice.cgst) : null,
        sgst: invoice.sgst ? Number(invoice.sgst) : null,
        igst: invoice.igst ? Number(invoice.igst) : null,
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
      },
    });

    const subject = `${org.name}: ${titleForKind(invoice.kind)} ${invoice.number}`;
    const body = `
      <div style="font-family: system-ui, -apple-system, sans-serif;">
        <p>Dear ${escapeHtml(invoice.client.name)},</p>
        <p>Please find attached ${titleForKind(invoice.kind).toLowerCase()} <strong>${escapeHtml(invoice.number)}</strong>.</p>
        <p>Amount: <strong>₹${Number(invoice.total).toLocaleString("en-IN")}</strong>${invoice.dueDate ? ` &middot; Due: ${invoice.dueDate.toLocaleDateString("en-IN")}` : ""}</p>
        <p>Regards,<br />${escapeHtml(org.name)}</p>
      </div>
    `;

    await mailer.send(to, subject, body, {
      attachments: [
        {
          filename: `${invoice.number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    await prisma.activityLog.create({
      data: {
        orgId: req.auth!.orgId,
        actorId: req.auth!.userId,
        action: "invoice.emailed",
        entity: "Invoice",
        entityId: invoice.id,
        meta: { to, number: invoice.number },
      },
    });

    await prisma.notification.create({
      data: {
        userId: req.auth!.userId,
        title: `Invoice ${invoice.number} emailed`,
        body: `Sent to ${to}`,
        link: `/invoices/${invoice.id}`,
      },
    });

    res.json({ ok: true, to });
  } catch (err) {
    next(err);
  }
});

function titleForKind(kind: string): string {
  return (
    {
      invoice: "Invoice",
      quotation: "Quotation",
      estimate: "Estimate",
      receipt: "Receipt",
    }[kind] ?? "Invoice"
  );
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}
