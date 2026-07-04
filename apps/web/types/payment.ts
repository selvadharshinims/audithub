import type { PaymentStatus } from "@audithub/types";

export interface PaymentRow {
  id: string;
  invoiceId: string;
  amount: string;
  method: string;
  status: PaymentStatus;
  dueDate: string | null;
  paidAt: string | null;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
  invoice: {
    id: string;
    number: string;
    total: string;
    client: { id: string; name: string };
  };
}
