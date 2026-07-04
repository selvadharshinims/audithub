export const REPORT_TYPES = ["revenue", "outstanding", "gst", "client-performance"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABEL: Record<ReportType, string> = {
  revenue: "Revenue",
  outstanding: "Outstanding",
  gst: "GST breakup",
  "client-performance": "Client performance",
};

export interface ReportPayload<Row = Record<string, unknown>> {
  type: ReportType;
  range: { from: string; to: string };
  rows: Row[];
  totals?: Record<string, number>;
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
  issuedAt: string;
  dueDate: string | null;
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
