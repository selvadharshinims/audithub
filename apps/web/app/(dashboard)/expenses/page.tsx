"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from "@/hooks/use-expenses";
import { formatDate, formatINR } from "@/lib/format";
import { isOffline } from "@/lib/offline";
import { Field, MobileList, TableScroll } from "@/components/ui/responsive-table";
import type { ExpenseRow } from "@/types/expense";
import { ExpenseForm } from "./_components/expense-form";

function toISO(d: string, endOfDay = false): string | undefined {
  if (!d) return undefined;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  if (endOfDay) dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");

  const filter = useMemo(
    () => ({
      from: toISO(from),
      to: toISO(to, true),
      category: category || undefined,
    }),
    [from, to, category],
  );

  const { data, isLoading, isError, error } = useExpenses(filter);
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const del = useDeleteExpense();

  const [mode, setMode] = useState<
    { kind: "closed" } | { kind: "create" } | { kind: "edit"; expense: ExpenseRow }
  >({ kind: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totals = useMemo(() => {
    if (!data) return { total: 0, byCategory: [] as Array<{ category: string; amount: number }> };
    let total = 0;
    const map = new Map<string, number>();
    for (const r of data.rows) {
      const amt = Number(r.amount);
      total += amt;
      map.set(r.category, (map.get(r.category) ?? 0) + amt);
    }
    return {
      total,
      byCategory: [...map.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
    };
  }, [data]);

  async function handleDelete(row: ExpenseRow) {
    if (!confirm(`Delete ₹${row.amount} spend on "${row.category}"?`)) return;
    setDeletingId(row.id);
    try {
      await del.mutateAsync(row.id);
    } catch (err) {
      if (!isOffline()) alert(err instanceof Error ? err.message : "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.rows.length} entries · Total ${formatINR(totals.total)}` : " "}
          </p>
        </div>
        <Button onClick={() => setMode({ kind: "create" })} className="w-full md:w-auto">
          <Plus className="h-4 w-4" />
          Add expense
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total in range</div>
          <div className="mt-1 text-xl font-semibold">{formatINR(totals.total)}</div>
        </Card>
        {totals.byCategory.slice(0, 2).map((b) => (
          <Card key={b.category} className="p-4">
            <div className="text-xs uppercase text-muted-foreground">Top: {b.category}</div>
            <div className="mt-1 text-xl font-semibold">{formatINR(b.amount)}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full sm:w-52"
          >
            <option value="">All</option>
            {data?.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            setFrom(firstOfMonth());
            setTo("");
            setCategory("");
          }}
        >
          Reset
        </Button>
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load expenses"}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : !data?.rows.length ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No expenses recorded in this range.
        </Card>
      ) : (
        <>
          {/* DESKTOP TABLE (md+) */}
          <TableScroll>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Category</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Notes</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Amount</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setMode({ kind: "edit", expense: r })}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(r.date)}</td>
                    <td className="px-4 py-3">{r.category}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {r.notes ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                      {formatINR(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="tap-target"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r);
                        }}
                        disabled={deletingId === r.id}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/40 text-sm font-semibold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right">{formatINR(totals.total)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </TableScroll>

          {/* MOBILE CARDS (below md) */}
          <MobileList>
            {data.rows.map((r) => (
              <Card
                key={r.id}
                onClick={() => setMode({ kind: "edit", expense: r })}
                className="cursor-pointer p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{r.category}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(r.date)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono font-semibold">{formatINR(r.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="tap-target"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r);
                      }}
                      disabled={del.isPending}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {r.notes && (
                  <div className="mt-3 space-y-1 border-t pt-3">
                    <Field label="Notes">{r.notes}</Field>
                  </div>
                )}
              </Card>
            ))}
            <Card className="flex items-center justify-between p-4 text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono">{formatINR(totals.total)}</span>
            </Card>
          </MobileList>
        </>
      )}

      <Modal
        open={mode.kind === "create"}
        onClose={() => setMode({ kind: "closed" })}
        title="Add expense"
      >
        {mode.kind === "create" && (
          <ExpenseForm
            submitLabel="Save"
            busy={create.isPending}
            suggestions={data?.categories.length ? data.categories : undefined}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              const p = create.mutateAsync(input);
              if (isOffline()) {
                p.catch(() => undefined);
                setMode({ kind: "closed" });
                return;
              }
              await p;
              setMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>

      <Modal
        open={mode.kind === "edit"}
        onClose={() => setMode({ kind: "closed" })}
        title="Edit expense"
      >
        {mode.kind === "edit" && (
          <ExpenseForm
            submitLabel="Save changes"
            busy={update.isPending}
            suggestions={data?.categories}
            initial={{
              category: mode.expense.category,
              amount: mode.expense.amount,
              date: mode.expense.date.slice(0, 10),
              notes: mode.expense.notes ?? "",
            }}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              const p = update.mutateAsync({ id: mode.expense.id, input });
              if (isOffline()) {
                p.catch(() => undefined);
                setMode({ kind: "closed" });
                return;
              }
              await p;
              setMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>
    </section>
  );
}
