import type { ClientStatus, InvoiceKind, PaymentStatus } from "@audithub/types";

export interface ClientRecord {
  id: string;
  orgId: string;
  assignedStaffId: string | null;
  name: string;
  pan: string | null;
  gstin: string | null;
  aadhaar: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail extends ClientRecord {
  companies: Array<{
    id: string;
    legalName: string;
    businessType: string | null;
    regNo: string | null;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    createdAt: string;
  }>;
}

export interface ClientFinanceInvoice {
  id: string;
  number: string;
  kind: InvoiceKind;
  status: PaymentStatus;
  total: string;
  paid: string;
  balance: string;
  issuedAt: string;
  dueDate: string | null;
}

export interface ClientFinancePayment {
  id: string;
  amount: string;
  method: string;
  status: PaymentStatus;
  paidAt: string | null;
  reference: string | null;
  invoice: { id: string; number: string };
}

export interface ClientFinance {
  summary: {
    invoiceCount: number;
    paymentCount: number;
    totalBilled: string;
    totalPaid: string;
    totalOutstanding: string;
    overdueCount: number;
    overdueAmount: string;
  };
  invoices: ClientFinanceInvoice[];
  payments: ClientFinancePayment[];
}
