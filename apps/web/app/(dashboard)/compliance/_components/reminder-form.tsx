"use client";

import { useState } from "react";
import { COMPLIANCE_TYPE, REMINDER_CHANNEL, type ReminderCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useClients } from "@/hooks/use-clients";

type FormState = {
  clientId: string;
  title: string;
  type: (typeof COMPLIANCE_TYPE)[number];
  dueDate: string;
  offsets: string;
  channel: (typeof REMINDER_CHANNEL)[number];
  active: boolean;
  notes: string;
};

const empty: FormState = {
  clientId: "",
  title: "",
  type: "GST",
  dueDate: "",
  offsets: "30, 15, 7, 3, 1",
  channel: "email",
  active: true,
  notes: "",
};

export interface ReminderFormProps {
  initial?: Partial<FormState>;
  submitLabel: string;
  onSubmit: (input: ReminderCreateInput) => Promise<unknown>;
  onCancel?: () => void;
  onDelete?: () => Promise<unknown>;
  onSendNow?: () => Promise<unknown>;
  busy?: boolean;
}

export function ReminderForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  onSendNow,
  busy,
}: ReminderFormProps) {
  const [values, setValues] = useState<FormState>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const clients = useClients();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.clientId) return setError("Please select a client");
    if (!values.dueDate) return setError("Please pick a due date");

    const offsets = values.offsets
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    const payload: ReminderCreateInput = {
      clientId: values.clientId,
      title: values.title.trim() || undefined,
      type: values.type,
      dueDate: new Date(values.dueDate),
      offsets,
      channel: values.channel,
      active: values.active,
      notes: values.notes.trim() || undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>
            Client<span className="ml-0.5 text-red-600">*</span>
          </Label>
          <Select value={values.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="">{clients.isLoading ? "Loading…" : "Select"}</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Compliance type</Label>
          <Select value={values.type} onChange={(e) => set("type", e.target.value as FormState["type"])}>
            {COMPLIANCE_TYPE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Title / period</Label>
          <Input
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. GSTR-3B for July 2025"
          />
        </div>

        <div className="space-y-1">
          <Label>
            Due date<span className="ml-0.5 text-red-600">*</span>
          </Label>
          <Input type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Channel</Label>
          <Select value={values.channel} onChange={(e) => set("channel", e.target.value as FormState["channel"])}>
            {REMINDER_CHANNEL.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Reminder offsets (days before)</Label>
          <Input
            value={values.offsets}
            onChange={(e) => set("offsets", e.target.value)}
            placeholder="30, 15, 7, 3, 1"
          />
          <p className="text-xs text-muted-foreground">Comma-separated positive integers.</p>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </div>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4 w-4"
          />
          Active
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (confirm("Delete this reminder?")) await onDelete();
            }}
            disabled={busy}
            className="w-full sm:mr-auto sm:w-auto"
          >
            Delete
          </Button>
        )}
        {onSendNow && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onSendNow()}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            Send test
          </Button>
        )}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
