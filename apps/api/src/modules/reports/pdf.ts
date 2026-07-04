import PDFDocument from "pdfkit";
import type { ReportPayload, ReportType } from "./service.js";

const TITLES: Record<ReportType, string> = {
  revenue: "Revenue by month",
  outstanding: "Outstanding invoices",
  gst: "GST breakup by month",
  "client-performance": "Client performance",
};

interface PdfColumn {
  header: string;
  key: string;
  align?: "left" | "right";
  width: number;
  money?: boolean;
  date?: boolean;
}

const COLUMNS: Record<ReportType, PdfColumn[]> = {
  revenue: [
    { header: "Month", key: "month", width: 80 },
    { header: "Invoices", key: "invoiceCount", width: 60, align: "right" },
    { header: "Billed", key: "billed", width: 100, align: "right", money: true },
    { header: "Collected", key: "collected", width: 100, align: "right", money: true },
    { header: "Outstanding", key: "outstanding", width: 100, align: "right", money: true },
  ],
  outstanding: [
    { header: "Invoice", key: "invoiceNumber", width: 70 },
    { header: "Client", key: "clientName", width: 130 },
    { header: "Issued", key: "issuedAt", width: 70, date: true },
    { header: "Due", key: "dueDate", width: 70, date: true },
    { header: "Total", key: "total", width: 80, align: "right", money: true },
    { header: "Overdue", key: "daysOverdue", width: 60, align: "right" },
  ],
  gst: [
    { header: "Month", key: "month", width: 70 },
    { header: "Subtotal", key: "subtotal", width: 90, align: "right", money: true },
    { header: "CGST", key: "cgst", width: 70, align: "right", money: true },
    { header: "SGST", key: "sgst", width: 70, align: "right", money: true },
    { header: "IGST", key: "igst", width: 70, align: "right", money: true },
    { header: "Tax total", key: "taxTotal", width: 90, align: "right", money: true },
  ],
  "client-performance": [
    { header: "Client", key: "clientName", width: 160 },
    { header: "Invoices", key: "invoices", width: 60, align: "right" },
    { header: "Billed", key: "billed", width: 90, align: "right", money: true },
    { header: "Collected", key: "collected", width: 90, align: "right", money: true },
    { header: "Outstanding", key: "outstanding", width: 90, align: "right", money: true },
  ],
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function renderReportPdf(payload: ReportPayload): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 36, layout: "landscape" });
  const grey = "#666";
  const dark = "#111827";
  const light = "#e5e7eb";
  const cols = COLUMNS[payload.type];

  doc.font("Helvetica-Bold").fontSize(16).fillColor(dark).text(TITLES[payload.type]);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(grey)
    .text(
      `Range: ${new Date(payload.range.from).toLocaleDateString("en-IN")} → ${new Date(payload.range.to).toLocaleDateString("en-IN")}`,
    );
  doc.moveDown(1);

  const startX = doc.x;
  let y = doc.y;

  // Header
  doc.rect(startX, y, cols.reduce((s, c) => s + c.width, 0), 22).fill(light);
  doc.fillColor(dark).font("Helvetica-Bold").fontSize(9);
  let x = startX + 6;
  for (const col of cols) {
    doc.text(col.header, x, y + 6, { width: col.width - 12, align: col.align ?? "left" });
    x += col.width;
  }
  y += 24;

  // Rows
  doc.font("Helvetica").fontSize(9);
  const rows = payload.rows as Array<Record<string, unknown>>;
  for (const r of rows) {
    if (y > 540) {
      doc.addPage({ size: "A4", margin: 36, layout: "landscape" });
      y = doc.y;
    }
    x = startX + 6;
    for (const col of cols) {
      const raw = r[col.key];
      const value = formatCell(raw, col);
      doc.fillColor(dark).text(value, x, y, { width: col.width - 12, align: col.align ?? "left" });
      x += col.width;
    }
    doc
      .moveTo(startX, y + 15)
      .lineTo(startX + cols.reduce((s, c) => s + c.width, 0), y + 15)
      .strokeColor(light)
      .stroke();
    y += 18;
  }

  // Totals
  if (payload.totals) {
    y += 6;
    x = startX + 6;
    doc.font("Helvetica-Bold").fontSize(9);
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i]!;
      const value = i === 0 ? "Total" : col.money && col.key in payload.totals ? inr.format(payload.totals[col.key]!) : "";
      doc.fillColor(dark).text(value, x, y, { width: col.width - 12, align: col.align ?? "left" });
      x += col.width;
    }
  }

  doc.end();
  return doc;
}

function formatCell(raw: unknown, col: PdfColumn): string {
  if (raw === null || raw === undefined || raw === "") return col.money ? inr.format(0) : "—";
  if (col.money) return inr.format(Number(raw));
  if (col.date) return new Date(String(raw)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return String(raw);
}
