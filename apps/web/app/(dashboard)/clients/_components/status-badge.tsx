import { Badge } from "@/components/ui/badge";
import type { ClientStatus } from "@audithub/types";

const map: Record<ClientStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  inactive: { label: "Inactive", variant: "muted" },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const cfg = map[status] ?? map.pending;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
