import { cn } from "@/lib/utils";
import type { ComplianceType } from "@audithub/types";

const styles: Record<ComplianceType, string> = {
  GST: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  ITR: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  TDS: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ROC: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  LICENSE: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export function ComplianceTypeBadge({
  type,
  className,
}: {
  type: ComplianceType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[type],
        className,
      )}
    >
      {type}
    </span>
  );
}
