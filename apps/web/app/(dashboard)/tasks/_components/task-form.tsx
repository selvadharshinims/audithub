"use client";

import { useState } from "react";
import { TASK_PRIORITY, TASK_STATUS, type TaskCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useClients } from "@/hooks/use-clients";
import { useUsers } from "@/hooks/use-users";

type FormState = {
  title: string;
  description: string;
  clientId: string;
  assigneeId: string;
  priority: (typeof TASK_PRIORITY)[number];
  status: (typeof TASK_STATUS)[number];
  dueDate: string;
  recurring: boolean;
};

const empty: FormState = {
  title: "",
  description: "",
  clientId: "",
  assigneeId: "",
  priority: "med",
  status: "todo",
  dueDate: "",
  recurring: false,
};

export interface TaskFormProps {
  initial?: Partial<FormState>;
  submitLabel: string;
  onSubmit: (input: TaskCreateInput) => Promise<unknown>;
  onCancel?: () => void;
  busy?: boolean;
}

export function TaskForm({ initial, submitLabel, onSubmit, onCancel, busy }: TaskFormProps) {
  const [values, setValues] = useState<FormState>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const clients = useClients();
  const users = useUsers();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.title.trim()) {
      setError("Title is required");
      return;
    }

    const payload: TaskCreateInput = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      clientId: values.clientId || undefined,
      assigneeId: values.assigneeId || undefined,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
      recurring: values.recurring,
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
      <div className="space-y-1">
        <Label>
          Title<span className="ml-0.5 text-red-600">*</span>
        </Label>
        <Input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. File GSTR-3B for July"
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea value={values.description} onChange={(e) => set("description", e.target.value)} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Client</Label>
          <Select value={values.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="">{clients.isLoading ? "Loading…" : "None"}</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Assignee</Label>
          <Select value={values.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
            <option value="">{users.isLoading ? "Loading…" : "Unassigned"}</option>
            {users.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Priority</Label>
          <Select value={values.priority} onChange={(e) => set("priority", e.target.value as FormState["priority"])}>
            {TASK_PRIORITY.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={values.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
            {TASK_STATUS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Due date</Label>
          <Input type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.recurring}
              onChange={(e) => set("recurring", e.target.checked)}
              className="h-4 w-4"
            />
            Recurring
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function statusLabel(s: (typeof TASK_STATUS)[number]): string {
  return { todo: "To Do", progress: "In Progress", review: "Review", done: "Done" }[s];
}
