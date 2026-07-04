"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import type { ServiceCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { useMe } from "@/hooks/use-me";
import {
  useCreateService,
  useDeleteService,
  useServices,
  useUpdateService,
} from "@/hooks/use-services";
import type { ServiceRow } from "@/types/service";

export default function ServicesPage() {
  const me = useMe();
  const { data, isLoading, isError, error } = useServices();
  const create = useCreateService();
  const update = useUpdateService();
  const del = useDeleteService();

  const canManage = ["super_admin", "auditor"].includes(me.data?.role.name ?? "");

  const [mode, setMode] = useState<
    { kind: "closed" } | { kind: "create" } | { kind: "edit"; service: ServiceRow }
  >({ kind: "closed" });

  async function handleDelete(row: ServiceRow) {
    if (!confirm(`Delete service "${row.name}"?`)) return;
    await del.mutateAsync(row.id);
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Services catalog</h1>
            <p className="text-sm text-muted-foreground">
              Reusable services with default fees and SAC codes — appears in the invoice form.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setMode({ kind: "create" })}>
              <Plus className="h-4 w-4" />
              New service
            </Button>
          )}
        </div>
      </header>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load services"}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : !data?.length ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No services in the catalog yet.</p>
          {canManage && (
            <Button className="mt-4" onClick={() => setMode({ kind: "create" })}>
              <Plus className="h-4 w-4" />
              Add your first service
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">SAC code</th>
                <th className="px-4 py-3 text-right font-medium">Default fee</th>
                {canManage && <th className="w-24 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.sacCode ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatINR(s.defaultFee)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMode({ kind: "edit", service: s })}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s)}
                        disabled={del.isPending}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={mode.kind === "create"}
        onClose={() => setMode({ kind: "closed" })}
        title="New service"
      >
        {mode.kind === "create" && (
          <ServiceForm
            submitLabel="Create"
            busy={create.isPending}
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
        title="Edit service"
      >
        {mode.kind === "edit" && (
          <ServiceForm
            submitLabel="Save changes"
            busy={update.isPending}
            initial={{
              name: mode.service.name,
              defaultFee: mode.service.defaultFee,
              sacCode: mode.service.sacCode ?? "",
            }}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              await update.mutateAsync({ id: mode.service.id, input });
              setMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>
    </section>
  );
}

type State = { name: string; defaultFee: string; sacCode: string };
const empty: State = { name: "", defaultFee: "", sacCode: "" };

function ServiceForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<State>;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: ServiceCreateInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<State>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) return setError("Name is required");
    try {
      await onSubmit({
        name: values.name.trim(),
        defaultFee: Number(values.defaultFee || 0),
        sacCode: values.sacCode.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Save failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="e.g. Statutory audit"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Default fee (₹)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.defaultFee}
            onChange={(e) => setValues((v) => ({ ...v, defaultFee: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>SAC code</Label>
          <Input
            value={values.sacCode}
            onChange={(e) => setValues((v) => ({ ...v, sacCode: e.target.value }))}
            placeholder="998222"
          />
        </div>
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
