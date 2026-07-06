"use client";

import { cn } from "@/lib/utils";
import type { ComplianceType } from "@audithub/types";
import type { ReminderRow } from "@/types/reminder";
import { ComplianceTypeBadge } from "./type-badge";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Solid dot colours mirroring the type badge — used for the compact mobile grid
// where reminder titles won't fit in a ~48px column.
const DOT: Record<ComplianceType, string> = {
  GST: "bg-blue-500",
  ITR: "bg-purple-500",
  TDS: "bg-amber-500",
  ROC: "bg-emerald-500",
  LICENSE: "bg-rose-500",
};

export interface CalendarProps {
  monthDate: Date;
  reminders: ReminderRow[];
  onReminderClick: (r: ReminderRow) => void;
  onDayClick: (date: Date) => void;
}

export function Calendar({ monthDate, reminders, onReminderClick, onDayClick }: CalendarProps) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = new Map<number, ReminderRow[]>();
  for (const r of reminders) {
    const d = new Date(r.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      const arr = byDay.get(day) ?? [];
      arr.push(r);
      byDay.set(day, arr);
    }
  }

  const cells: Array<{ day: number | null; date?: Date }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ day: null });

  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    // Full width on phones (no horizontal scroll); roomy fixed grid on sm+.
    <div className="min-w-full overflow-hidden rounded-lg border bg-card text-xs sm:min-w-[720px]">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-1 py-2 sm:px-2">
            <span className="sm:hidden">{w[0]}</span>
            <span className="hidden sm:inline">{w}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const items = cell.day ? byDay.get(cell.day) ?? [] : [];
          const isToday = cell.date ? isSameDay(cell.date, today) : false;
          return (
            <div
              key={i}
              onClick={() => cell.date && onDayClick(cell.date)}
              className={cn(
                "min-h-[62px] border-b border-r p-1 last:border-r-0 sm:min-h-[110px] sm:p-1.5",
                cell.day ? "cursor-pointer hover:bg-muted/40" : "bg-muted/10",
                i % 7 === 6 && "border-r-0",
              )}
            >
              {cell.day && (
                <>
                  <div
                    className={cn(
                      "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] sm:h-6 sm:w-6 sm:text-xs",
                      isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {cell.day}
                  </div>

                  {/* MOBILE: coloured dots (titles won't fit) */}
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {items.slice(0, 4).map((r) => (
                        <span
                          key={r.id}
                          className={cn("h-1.5 w-1.5 rounded-full", DOT[r.type])}
                          aria-label={r.title ?? r.client.name}
                        />
                      ))}
                      {items.length > 4 && (
                        <span className="text-[9px] leading-none text-muted-foreground">
                          +{items.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* DESKTOP: full reminder rows */}
                  <div className="hidden space-y-1 sm:block">
                    {items.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReminderClick(r);
                        }}
                        className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left hover:bg-muted"
                      >
                        <ComplianceTypeBadge type={r.type} />
                        <span className="truncate text-[11px]">{r.title ?? r.client.name}</span>
                      </button>
                    ))}
                    {items.length > 3 && (
                      <div className="px-1 text-[11px] text-muted-foreground">+{items.length - 3} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
