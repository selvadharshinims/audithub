import type { InvoiceKind, PaymentStatus } from "@audithub/types";

export interface InvoiceRow {
  id: string;
  clientId: string;
  client: { id: string; name: string };
  number: string;
  kind: InvoiceKind;
  description: string | null;
  subtotal: string;
  cgst: string | null;
  sgst: string | null;
  igst: string | null;
  tax: string;
  total: string;
  status: PaymentStatus;
  issuedAt: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail extends InvoiceRow {
  client: {
    id: string;
    name: string;
    gstin: string | null;
    pan: string | null;
    address: string | null;
    email?: string | null;
    mobile?: string | null;
  };
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    status: PaymentStatus;
    paidAt: string | null;
    reference: string | null;
  }>;
}
