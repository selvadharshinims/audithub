"use client";

import { useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import type { CompanyCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api";
import {
  useClientCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from "@/hooks/use-companies";
import type { CompanyRow } from "@/types/company";

export function CompaniesSection({ clientId }: { clientId: string }) {
  const { data, isLoading } = useClientCompanies(clientId);
  const create = useCreateCompany(clientId);
  const update = useUpdateCompany(clientId);
  const del = useDeleteCompany(clientId);

  const [mode, setMode] = useState<
    { kind: "closed" } | { kind: "create" } | { kind: "edit"; company: CompanyRow }
  >({ kind: "closed" });

  async function handleDelete(row: CompanyRow) {
    if (!confirm(`Delete "${row.legalName}"?`)) return;
    await del.mutateAsync(row.id);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Companies</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">No legal entities linked yet.</p>
        ) : (
          <ul className="divide-y">
            {data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.legalName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[c.businessType, c.regNo && `Reg: ${c.regNo}`].filter(Boolean).join(" · ") || "No details"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target"
                    onClick={() => setMode({ kind: "edit", company: c })}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="tap-target"
                    onClick={() => handleDelete(c)}
                    disabled={del.isPending}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Modal
        open={mode.kind === "create"}
        onClose={() => setMode({ kind: "closed" })}
        title="Add company"
      >
        {mode.kind === "create" && (
          <CompanyForm
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
        title="Edit company"
      >
        {mode.kind === "edit" && (
          <CompanyForm
            submitLabel="Save changes"
            busy={update.isPending}
            initial={{
              legalName: mode.company.legalName,
              businessType: mode.company.businessType ?? "",
              regNo: mode.company.regNo ?? "",
            }}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              await update.mutateAsync({ id: mode.company.id, input });
              setMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

type State = { legalName: string; businessType: string; regNo: string };
const empty: State = { legalName: "", businessType: "", regNo: "" };

function CompanyForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<State>;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: CompanyCreateInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<State>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.legalName.trim()) return setError("Legal name is required");
    try {
      await onSubmit({
        legalName: values.legalName.trim(),
        businessType: values.businessType.trim() || undefined,
        regNo: values.regNo.trim() || undefined,
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
        <Label>Legal name</Label>
        <Input
          value={values.legalName}
          onChange={(e) => setValues((v) => ({ ...v, legalName: e.target.value }))}
          placeholder="e.g. Acme Traders Pvt. Ltd."
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Business type</Label>
          <Input
            value={values.businessType}
            onChange={(e) => setValues((v) => ({ ...v, businessType: e.target.value }))}
            placeholder="Pvt Ltd / LLP / Proprietorship"
          />
        </div>
        <div className="space-y-1">
          <Label>Registration no.</Label>
          <Input
            value={values.regNo}
            onChange={(e) => setValues((v) => ({ ...v, regNo: e.target.value }))}
            placeholder="CIN / LLPIN / other"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={busy}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
