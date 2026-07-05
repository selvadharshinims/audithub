import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Responsive list/table primitives — the ONE canonical approach for every list page.
 *
 * Loading / empty / error states render once (full width, unchanged). Only the
 * populated data forks into a desktop table (md+) and mobile stacked cards (below md):
 *
 *   {isLoading ? (
 *     <Card className="p-8 text-center …">Loading…</Card>
 *   ) : rows.length === 0 ? (
 *     <Card className="p-10 text-center">…empty…</Card>
 *   ) : (
 *     <>
 *       <TableScroll>
 *         <table className="w-full min-w-[720px] text-sm">…</table>
 *       </TableScroll>
 *       <MobileList>
 *         {rows.map((r) => (
 *           <Card key={r.id} className="p-4">
 *             …top row: title + badge + actions…
 *             <div className="mt-3 space-y-1 border-t pt-3">
 *               <Field label="PAN">{r.pan}</Field>
 *             </div>
 *           </Card>
 *         ))}
 *       </MobileList>
 *     </>
 *   )}
 *
 * TableScroll and MobileList are siblings inside the populated fragment — never nest them.
 */

/**
 * Desktop table wrapper: Card + horizontal scroll, hidden below md.
 * Put a bare <table className="w-full min-w-[720px] text-sm"> inside.
 */
export function TableScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("hidden overflow-hidden md:block", className)}>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

/** Mobile stacked-card list container, hidden at md+. */
export function MobileList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3 md:hidden", className)}>{children}</div>;
}

/** Labeled key/value row inside a mobile card. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium">{children}</span>
    </div>
  );
}
