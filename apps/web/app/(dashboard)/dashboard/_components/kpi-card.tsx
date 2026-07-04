import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "default" | "warning" | "success" | "danger";

const iconTone: Record<KpiTone, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/15 text-destructive",
};

const glowTone: Record<KpiTone, string> = {
  default: "from-primary/[0.06] via-transparent",
  warning: "from-warning/[0.06] via-transparent",
  success: "from-success/[0.06] via-transparent",
  danger: "from-destructive/[0.06] via-transparent",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: KpiTone;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-4 shadow-premium-sm transition-shadow hover:shadow-premium",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-70",
          glowTone[tone],
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className={cn("rounded-lg p-1.5 transition-transform group-hover:scale-105", iconTone[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="relative mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
