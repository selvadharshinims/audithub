"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  useCreateReminder,
  useDeleteReminder,
  useReminders,
  useSendReminderNow,
  useUpdateReminder,
} from "@/hooks/use-reminders";
import { formatDate } from "@/lib/format";
import type { ReminderRow } from "@/types/reminder";
import { Calendar } from "./_components/calendar";
import { ReminderForm } from "./_components/reminder-form";
import { ComplianceTypeBadge } from "./_components/type-badge";

type Mode =
  | { kind: "closed" }
  | { kind: "create"; dueDate?: string }
  | { kind: "edit"; reminder: ReminderRow };

export default function CompliancePage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [mode, setMode] = useState<Mode>({ kind: "closed" });

  const range = useMemo(() => {
    const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
  }, [monthDate]);

  const { data, isLoading, isError, error, refetch } = useReminders(range);
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const del = useDeleteReminder();
  const sendNow = useSendReminderNow();

  const monthLabel = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const upcoming = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [data]);

  function shiftMonth(delta: number) {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Compliance</h1>
          <p className="text-sm text-muted-foreground">Statutory deadlines &amp; auto reminders.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-medium ${
                view === "calendar" ? "bg-muted" : "text-muted-foreground"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-medium ${
                view === "list" ? "bg-muted" : "text-muted-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
          <Button onClick={() => setMode({ kind: "create" })}>
            <Plus className="h-4 w-4" />
            New reminder
          </Button>
        </div>
      </header>

      {view === "calendar" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[10rem] text-center text-sm font-medium">{monthLabel}</div>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const d = new Date();
              setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Today
          </Button>
        </div>
      )}

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load: {error instanceof Error ? error.message : "Unknown"}{" "}
          <Button variant="link" onClick={() => refetch()} className="h-auto p-0 text-red-700">
            Retry
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : view === "calendar" ? (
        <Calendar
          monthDate={monthDate}
          reminders={data ?? []}
          onReminderClick={(r) => setMode({ kind: "edit", reminder: r })}
          onDayClick={(d) => setMode({ kind: "create", dueDate: d.toISOString().slice(0, 10) })}
        />
      ) : upcoming.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No reminders in this range.</p>
          <Button className="mt-4" onClick={() => setMode({ kind: "create" })}>
            <Plus className="h-4 w-4" />
            Add reminder
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Offsets</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setMode({ kind: "edit", reminder: r })}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">{formatDate(r.dueDate)}</td>
                  <td className="px-4 py-3">
                    <ComplianceTypeBadge type={r.type} />
                  </td>
                  <td className="px-4 py-3">{r.client.name}</td>
                  <td className="px-4 py-3">{r.title ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.offsets.join(", ")}</td>
                  <td className="px-4 py-3 capitalize">{r.channel}</td>
                  <td className="px-4 py-3">{r.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={mode.kind === "create"}
        onClose={() => setMode({ kind: "closed" })}
        title="New reminder"
      >
        {mode.kind === "create" && (
          <ReminderForm
            submitLabel="Create reminder"
            busy={create.isPending}
            initial={mode.dueDate ? { dueDate: mode.dueDate } : undefined}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              await create.mutateAsync(input);
              setMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>

      <Modal
        open={mode.kind === "edit"}
        onClose={() => setMode({ kind: "closed" })}
        title="Edit reminder"
      >
        {mode.kind === "edit" && (
          <ReminderForm
            submitLabel="Save changes"
            busy={update.isPending || del.isPending}
            initial={{
              clientId: mode.reminder.clientId,
              title: mode.reminder.title ?? "",
              type: mode.reminder.type,
              dueDate: mode.reminder.dueDate.slice(0, 10),
              offsets: mode.reminder.offsets.join(", "),
              channel: (mode.reminder.channel as "email" | "push" | "whatsapp") ?? "email",
              active: mode.reminder.active,
              notes: mode.reminder.notes ?? "",
            }}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              await update.mutateAsync({ id: mode.reminder.id, input });
              setMode({ kind: "closed" });
            }}
            onDelete={async () => {
              await del.mutateAsync(mode.reminder.id);
              setMode({ kind: "closed" });
            }}
            onSendNow={async () => {
              try {
                await sendNow.mutateAsync(mode.reminder.id);
                alert("Test reminder dispatched — check your API server logs.");
              } catch (err) {
                alert(err instanceof Error ? err.message : "Send failed");
              }
            }}
          />
        )}
      </Modal>
    </section>
  );
}
