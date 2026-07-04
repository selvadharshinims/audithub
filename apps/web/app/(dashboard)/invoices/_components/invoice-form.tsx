"use client";

import { useMemo, useState } from "react";
import { INVOICE_KIND, PAYMENT_STATUS, type InvoiceCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { useClients } from "@/hooks/use-clients";
import { useServices } from "@/hooks/use-services";

type FormState = {
  clientId: string;
  number: string;
  kind: (typeof INVOICE_KIND)[number];
  description: string;
  issuedAt: string;
  dueDate: string;
  subtotal: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  status: (typeof PAYMENT_STATUS)[number];
  notes: string;
};

const empty: FormState = {
  clientId: "",
  number: "",
  kind: "invoice",
  description: "",
  issuedAt: new Date().toISOString().slice(0, 10),
  dueDate: "",
  subtotal: "",
  cgstRate: "9",
  sgstRate: "9",
  igstRate: "0",
  status: "pending",
  notes: "",
};

export interface InvoiceFormProps {
  initial?: Partial<FormState>;
  submitLabel: string;
  onSubmit: (input: InvoiceCreateInput) => Promise<unknown>;
  onCancel?: () => void;
  busy?: boolean;
  lockClient?: boolean;
}

export function InvoiceForm({ initial, submitLabel, onSubmit, onCancel, busy, lockClient }: InvoiceFormProps) {
  const [values, setValues] = useState<FormState>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const clients = useClients();
  const services = useServices();

  function applyService(serviceId: string) {
    if (!serviceId) return;
    const svc = services.data?.find((s) => s.id === serviceId);
    if (!svc) return;
    setValues((v) => ({
      ...v,
      description: v.description || svc.name,
      subtotal: v.subtotal || String(svc.defaultFee),
    }));
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const totals = useMemo(() => {
    const sub = Number(values.subtotal) || 0;
    const cgst = sub * ((Number(values.cgstRate) || 0) / 100);
    const sgst = sub * ((Number(values.sgstRate) || 0) / 100);
    const igst = sub * ((Number(values.igstRate) || 0) / 100);
    const tax = cgst + sgst + igst;
    return { sub, cgst, sgst, igst, tax, total: sub + tax };
  }, [values.subtotal, values.cgstRate, values.sgstRate, values.igstRate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.clientId) {
      setError("Please select a client");
      return;
    }
    if (!values.number.trim()) {
      setError("Invoice number is required");
      return;
    }
    if (totals.sub <= 0) {
      setError("Subtotal must be greater than zero");
      return;
    }

    const payload: InvoiceCreateInput = {
      clientId: values.clientId,
      number: values.number.trim(),
      kind: values.kind,
      description: values.description.trim() || undefined,
      subtotal: totals.sub,
      cgst: totals.cgst || undefined,
      sgst: totals.sgst || undefined,
      igst: totals.igst || undefined,
      tax: totals.tax,
      total: totals.total,
      status: values.status,
      issuedAt: values.issuedAt ? new Date(values.issuedAt) : undefined,
      dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>
            Client<span className="ml-0.5 text-red-600">*</span>
          </Label>
          <Select
            value={values.clientId}
            onChange={(e) => set("clientId", e.target.value)}
            disabled={lockClient}
          >
            <option value="">
              {clients.isLoading ? "Loading clients…" : "Select a client"}
            </option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Kind</Label>
          <Select value={values.kind} onChange={(e) => set("kind", e.target.value as FormState["kind"])}>
            {INVOICE_KIND.map((k) => (
              <option key={k} value={k}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>
            Invoice number<span className="ml-0.5 text-red-600">*</span>
          </Label>
          <Input
            value={values.number}
            onChange={(e) => set("number", e.target.value)}
            placeholder="INV-2025-001"
          />
        </div>

        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={values.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
            {PAYMENT_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Issue date</Label>
          <Input type="date" value={values.issuedAt} onChange={(e) => set("issuedAt", e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Due date</Label>
          <Input type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </div>

        {services.data && services.data.length > 0 && (
          <div className="space-y-1 md:col-span-2">
            <Label>Pre-fill from service</Label>
            <Select defaultValue="" onChange={(e) => applyService(e.target.value)}>
              <option value="">Select a service…</option>
              {services.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatINR(s.defaultFee)}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Only fills empty description / subtotal — won&apos;t overwrite what you&apos;ve typed.
            </p>
          </div>
        )}

        <div className="space-y-1 md:col-span-2">
          <Label>Description</Label>
          <Input
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="e.g. Statutory audit for FY 2024-25"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Amount &amp; GST</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label>
              Subtotal (₹)<span className="ml-0.5 text-red-600">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={values.subtotal}
              onChange={(e) => set("subtotal", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label>CGST %</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={values.cgstRate}
              onChange={(e) => set("cgstRate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>SGST %</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={values.sgstRate}
              onChange={(e) => set("sgstRate", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>IGST %</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={values.igstRate}
              onChange={(e) => set("igstRate", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-t pt-3 text-sm md:grid-cols-4">
          <Row label="CGST" value={formatINR(totals.cgst)} />
          <Row label="SGST" value={formatINR(totals.sgst)} />
          <Row label="IGST" value={formatINR(totals.igst)} />
          <Row label="Tax total" value={formatINR(totals.tax)} />
          <Row label="Subtotal" value={formatINR(totals.sub)} />
          <div className="col-span-3 flex items-baseline justify-end gap-3">
            <span className="text-xs uppercase text-muted-foreground">Grand total</span>
            <span className="text-lg font-semibold">{formatINR(totals.total)}</span>
          </div>
        </div>
      </section>

      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
