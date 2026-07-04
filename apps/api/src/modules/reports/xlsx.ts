import ExcelJS from "exceljs";
import type { ReportPayload, ReportType } from "./service.js";

interface Column {
  header: string;
  key: string;
  width?: number;
  money?: boolean;
}

const COLUMNS: Record<ReportType, Column[]> = {
  revenue: [
    { header: "Month", key: "month", width: 12 },
    { header: "Invoices", key: "invoiceCount", width: 10 },
    { header: "Billed", key: "billed", width: 15, money: true },
    { header: "Collected", key: "collected", width: 15, money: true },
    { header: "Outstanding", key: "outstanding", width: 15, money: true },
  ],
  outstanding: [
    { header: "Invoice", key: "invoiceNumber", width: 15 },
    { header: "Client", key: "clientName", width: 30 },
    { header: "Issued", key: "issuedAt", width: 12 },
    { header: "Due", key: "dueDate", width: 12 },
    { header: "Total", key: "total", width: 15, money: true },
    { header: "Status", key: "status", width: 12 },
    { header: "Days overdue", key: "daysOverdue", width: 14 },
  ],
  gst: [
    { header: "Month", key: "month", width: 12 },
    { header: "Subtotal", key: "subtotal", width: 15, money: true },
    { header: "CGST", key: "cgst", width: 12, money: true },
    { header: "SGST", key: "sgst", width: 12, money: true },
    { header: "IGST", key: "igst", width: 12, money: true },
    { header: "Tax total", key: "taxTotal", width: 15, money: true },
  ],
  "client-performance": [
    { header: "Client", key: "clientName", width: 30 },
    { header: "Invoices", key: "invoices", width: 10 },
    { header: "Billed", key: "billed", width: 15, money: true },
    { header: "Collected", key: "collected", width: 15, money: true },
    { header: "Outstanding", key: "outstanding", width: 15, money: true },
  ],
};

const TITLES: Record<ReportType, string> = {
  revenue: "Revenue by month",
  outstanding: "Outstanding invoices",
  gst: "GST breakup by month",
  "client-performance": "Client performance",
};

export async function buildReportXlsx(payload: ReportPayload): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AuditHub";
  wb.created = new Date();

  const cols = COLUMNS[payload.type];
  const ws = wb.addWorksheet(TITLES[payload.type]);

  ws.addRow([TITLES[payload.type]]).font = { size: 14, bold: true };
  ws.addRow([
    `Range: ${new Date(payload.range.from).toLocaleDateString("en-IN")} → ${new Date(payload.range.to).toLocaleDateString("en-IN")}`,
  ]).font = { color: { argb: "FF666666" } };
  ws.addRow([]);

  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 14 }));
  const headerRow = ws.getRow(4);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };

  const rows = payload.rows as Array<Record<string, unknown>>;
  for (const r of rows) {
    ws.addRow(r);
  }

  // Money formatting
  const inrFmt = '"₹"#,##0.00';
  cols.forEach((c, i) => {
    if (c.money) ws.getColumn(i + 1).numFmt = inrFmt;
  });

  // Totals row
  if (payload.totals) {
    ws.addRow([]);
    const totalsRow: Record<string, unknown> = { [cols[0]!.key]: "Total" };
    for (const c of cols) {
      if (c.money && c.key in payload.totals) totalsRow[c.key] = payload.totals[c.key];
    }
    const row = ws.addRow(totalsRow);
    row.font = { bold: true };
    row.border = { top: { style: "thin" } };
  }

  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr as ArrayBuffer);
}
