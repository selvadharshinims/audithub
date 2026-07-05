import { cn } from "@/lib/utils";

/**
 * AuditHub brand lockup: the pyramid mark (from the real logo art, shown on a
 * fixed dark tile so it works on any theme) + the "Audit"(blue) "Hub"(red)
 * wordmark. The tile crops the full logo PNG down to just the pyramid via
 * background-size/position.
 */
export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        role="img"
        aria-label="AuditHub"
        className="h-9 w-9 shrink-0 rounded-lg bg-[#05070e] shadow-sm ring-1 ring-black/20"
        style={{
          backgroundImage: "url(/audithub-logo.png)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "176%",
          backgroundPosition: "center 34%",
        }}
      />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight">
            <span className="text-primary">Audit</span>
            <span className="text-accent">Hub</span>
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Practice OS
          </span>
        </div>
      )}
    </div>
  );
}
