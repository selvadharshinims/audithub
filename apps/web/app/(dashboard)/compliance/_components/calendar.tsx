"use client";

import { cn } from "@/lib/utils";
import type { ReminderRow } from "@/types/reminder";
import { ComplianceTypeBadge } from "./type-badge";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium uppercase text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2">
            {w}
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
                "min-h-[110px] border-b border-r p-1.5 text-xs last:border-r-0",
                cell.day ? "cursor-pointer hover:bg-muted/40" : "bg-muted/10",
                i % 7 === 6 && "border-r-0",
              )}
            >
              {cell.day && (
                <>
                  <div
                    className={cn(
                      "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {cell.day}
                  </div>
                  <div className="space-y-1">
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
