import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@audithub/types";

const map: Record<TaskPriority, { label: string; variant: "muted" | "warning" | "destructive" }> = {
  low: { label: "Low", variant: "muted" },
  med: { label: "Med", variant: "warning" },
  high: { label: "High", variant: "destructive" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = map[priority] ?? map.med;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
