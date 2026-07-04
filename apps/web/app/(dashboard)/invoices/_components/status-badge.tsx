import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@audithub/types";

const map: Record<
  PaymentStatus,
  { label: string; variant: "default" | "success" | "warning" | "muted" | "destructive" }
> = {
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  partial: { label: "Partial", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = map[status] ?? map.pending;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
