import { cn } from "@/lib/utils";

/**
 * AuditHub brand lockup: the pyramid mark (pre-cropped from the logo art to a
 * transparent square, so it sits cleanly on the dark tile at any size) + the
 * "Audit"(blue) "Hub"(red) wordmark set in the geometric brand face.
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
      <img
        src="/audithub-mark.png"
        alt="AuditHub"
        className="h-9 w-9 shrink-0 rounded-lg bg-[#05070e] object-contain p-1 shadow-sm ring-1 ring-black/20"
      />
      {showWordmark && (
        <span className="font-brand text-[17px] font-bold leading-none tracking-tight">
          <span className="text-primary">Audit</span>
          <span className="text-accent">Hub</span>
        </span>
      )}
    </div>
  );
}
