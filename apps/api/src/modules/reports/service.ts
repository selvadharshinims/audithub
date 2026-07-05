import { prisma } from "../../lib/prisma.js";

export const REPORT_TYPES = ["revenue", "outstanding", "gst", "client-performance"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface Range {
  from: Date;
  to: Date;
}

export interface RevenueRow {
  month: string;
  billed: number;
  collected: number;
  outstanding: number;
  invoiceCount: number;
}

export interface OutstandingRow {
  invoiceNumber: string;
  clientName: string;
  issuedAt: Date;
  dueDate: Date | null;
  total: number;
  status: string;
  daysOverdue: number;
}

export interface GstRow {
  month: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
}

export interface ClientPerformanceRow {
  clientName: string;
  invoices: number;
  billed: number;
  collected: number;
  outstanding: number;
}

export interface ReportPayload {
  type: ReportType;
  range: { from: string; to: string };
  rows: unknown[];
  totals?: Record<string, number>;
}

const DAY = 24 * 60 * 60 * 1000;

function monthKey(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function toNumber(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

export async function buildReport(orgId: string, type: ReportType, range: Range): Promise<ReportPayload> {
  const rangeMeta = { from: range.from.toISOString(), to: range.to.toISOString() };

  if (type === "revenue") {
    const invoices = await prisma.invoice.findMany({
      where: { client: { orgId }, kind: "invoice", issuedAt: { gte: range.from, lte: range.to } },
      select: {
        total: true,
        issuedAt: true,
        payments: { where: { status: "paid" }, select: { amount: true } },
      },
    });
    const buckets = new Map<string, RevenueRow>();
    for (const inv of invoices) {
      const key = monthKey(inv.issuedAt);
      const bucket = buckets.get(key) ?? {
        month: key,
        billed: 0,
        collected: 0,
        outstanding: 0,
        invoiceCount: 0,
      };
      const total = toNumber(inv.total);
      const paid = inv.payments.reduce((s, p) => s + toNumber(p.amount), 0);
      bucket.billed += total;
      bucket.invoiceCount += 1;
      bucket.collected += Math.min(paid, total);
      bucket.outstanding += Math.max(0, total - paid);
      buckets.set(key, bucket);
    }
    const rows = [...buckets.values()];
    const totals = rows.reduce(
      (acc, r) => ({
        billed: acc.billed + r.billed,
        collected: acc.collected + r.collected,
        outstanding: acc.outstanding + r.outstanding,
      }),
      { billed: 0, collected: 0, outstanding: 0 },
    );
    return { type, range: rangeMeta, rows, totals };
  }

  if (type === "outstanding") {
    const now = new Date();
    const invoices = await prisma.invoice.findMany({
      where: {
        client: { orgId },
        kind: "invoice",
        status: { in: ["pending", "partial", "overdue"] },
        issuedAt: { gte: range.from, lte: range.to },
      },
      include: {
        client: { select: { name: true } },
        payments: { where: { status: "paid" }, select: { amount: true } },
      },
      orderBy: [{ dueDate: "asc" }, { issuedAt: "asc" }],
    });
    const rows: OutstandingRow[] = invoices.map((inv) => ({
      invoiceNumber: inv.number,
      clientName: inv.client.name,
      issuedAt: inv.issuedAt,
      dueDate: inv.dueDate,
      // Amount still owed = invoice total minus payments received.
      total: Math.max(0, toNumber(inv.total) - inv.payments.reduce((s, p) => s + toNumber(p.amount), 0)),
      status: inv.status,
      daysOverdue: inv.dueDate ? Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / DAY)) : 0,
    }));
    const totals = { total: rows.reduce((s, r) => s + r.total, 0) };
    return { type, range: rangeMeta, rows, totals };
  }

  if (type === "gst") {
    const invoices = await prisma.invoice.findMany({
      where: { client: { orgId }, kind: "invoice", issuedAt: { gte: range.from, lte: range.to } },
      select: { subtotal: true, cgst: true, sgst: true, igst: true, tax: true, issuedAt: true },
    });
    const buckets = new Map<string, GstRow>();
    for (const inv of invoices) {
      const key = monthKey(inv.issuedAt);
      const bucket = buckets.get(key) ?? { month: key, subtotal: 0, cgst: 0, sgst: 0, igst: 0, taxTotal: 0 };
      bucket.subtotal += toNumber(inv.subtotal);
      bucket.cgst += toNumber(inv.cgst);
      bucket.sgst += toNumber(inv.sgst);
      bucket.igst += toNumber(inv.igst);
      bucket.taxTotal += toNumber(inv.tax);
      buckets.set(key, bucket);
    }
    const rows = [...buckets.values()];
    const totals = rows.reduce(
      (acc, r) => ({
        subtotal: acc.subtotal + r.subtotal,
        cgst: acc.cgst + r.cgst,
        sgst: acc.sgst + r.sgst,
        igst: acc.igst + r.igst,
        taxTotal: acc.taxTotal + r.taxTotal,
      }),
      { subtotal: 0, cgst: 0, sgst: 0, igst: 0, taxTotal: 0 },
    );
    return { type, range: rangeMeta, rows, totals };
  }

  if (type === "client-performance") {
    const invoices = await prisma.invoice.findMany({
      where: { client: { orgId }, kind: "invoice", issuedAt: { gte: range.from, lte: range.to } },
      include: {
        client: { select: { id: true, name: true } },
        payments: { where: { status: "paid" }, select: { amount: true } },
      },
    });
    const byClient = new Map<string, ClientPerformanceRow>();
    for (const inv of invoices) {
      const key = inv.client.id;
      const bucket = byClient.get(key) ?? {
        clientName: inv.client.name,
        invoices: 0,
        billed: 0,
        collected: 0,
        outstanding: 0,
      };
      const total = toNumber(inv.total);
      const paid = inv.payments.reduce((s, p) => s + toNumber(p.amount), 0);
      bucket.invoices += 1;
      bucket.billed += total;
      bucket.collected += Math.min(paid, total);
      bucket.outstanding += Math.max(0, total - paid);
      byClient.set(key, bucket);
    }
    const rows = [...byClient.values()].sort((a, b) => b.billed - a.billed);
    const totals = rows.reduce(
      (acc, r) => ({
        billed: acc.billed + r.billed,
        collected: acc.collected + r.collected,
        outstanding: acc.outstanding + r.outstanding,
      }),
      { billed: 0, collected: 0, outstanding: 0 },
    );
    return { type, range: rangeMeta, rows, totals };
  }

  throw new Error(`Unknown report type: ${type}`);
}
