import { api } from "@/lib/api";
import { formatDate, formatINR } from "@/lib/format";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Normalise an Indian mobile number to the digits-only international form wa.me
 * expects (no `+`). Assumes +91 for bare 10-digit numbers; passes through
 * numbers that already carry a country code. Returns null if it can't.
 */
export function toWhatsappNumber(raw: string | null | undefined, defaultCc = "91"): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2); // 00 international prefix
  if (digits.length === 10) digits = defaultCc + digits; // bare local number → +91
  else if (digits.length === 11 && digits.startsWith("0")) digits = defaultCc + digits.slice(1);
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

const KIND_LABEL: Record<string, string> = {
  invoice: "invoice",
  quotation: "quotation",
  estimate: "estimate",
  receipt: "receipt",
};

/** Fetch a public share link for the invoice PDF (signed, unauthenticated). */
export async function fetchInvoiceShareLink(invoiceId: string): Promise<string> {
  const { token } = await api.get<{ token: string }>(`/invoices/${invoiceId}/share`);
  return `${API_BASE}/invoices/public/${token}`;
}

export interface ShareInvoice {
  number: string;
  kind: string;
  total: string;
  dueDate: string | null;
  clientName: string;
}

/** Plain-text message body shared over WhatsApp and pre-filled into email. */
export function buildInvoiceMessage(inv: ShareInvoice, firmName: string, link: string): string {
  const kind = KIND_LABEL[inv.kind] ?? "invoice";
  const lines = [
    `Dear ${inv.clientName},`,
    ``,
    `Please find your ${kind} ${inv.number} from ${firmName}.`,
    ``,
    `Amount: ${formatINR(inv.total)}`,
  ];
  if (inv.dueDate) lines.push(`Due date: ${formatDate(inv.dueDate)}`);
  lines.push(``, `View / download: ${link}`, ``, `Regards,`, firmName);
  return lines.join("\n");
}

export function emailSubject(inv: ShareInvoice, firmName: string): string {
  const kind = (KIND_LABEL[inv.kind] ?? "Invoice").replace(/^\w/, (c) => c.toUpperCase());
  return `${firmName}: ${kind} ${inv.number}`;
}
