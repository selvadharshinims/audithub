"use client";

import { useState } from "react";
import type { ExpenseCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";

const DEFAULT_CATEGORIES = [
  "Office supplies",
  "Rent",
  "Utilities",
  "Salaries",
  "Software",
  "Travel",
  "Marketing",
  "Professional fees",
  "Miscellaneous",
];

type State = {
  category: string;
  amount: string;
  date: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const empty: State = { category: "", amount: "", date: today(), notes: "" };

export function ExpenseForm({
  initial,
  submitLabel,
  suggestions = DEFAULT_CATEGORIES,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<State>;
  submitLabel: string;
  suggestions?: string[];
  busy?: boolean;
  onSubmit: (input: ExpenseCreateInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<State>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.category.trim()) return setError("Category is required");
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Amount must be positive");

    try {
      await onSubmit({
        category: values.category.trim(),
        amount,
        date: new Date(values.date),
        notes: values.notes.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Save failed");
    }
  }

  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Category</Label>
        <Input
          value={values.category}
          onChange={(e) => set("category", e.target.value)}
          list="expense-categories"
          placeholder="e.g. Office supplies"
        />
        <datalist id="expense-categories">
          {suggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Amount (₹)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea rows={2} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
