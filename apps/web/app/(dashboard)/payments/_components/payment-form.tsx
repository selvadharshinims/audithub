"use client";

import { useMemo, useState } from "react";
import { PAYMENT_METHOD, PAYMENT_STATUS, type PaymentCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { useInvoices } from "@/hooks/use-invoices";
import { formatINR } from "@/lib/format";

type FormState = {
  invoiceId: string;
  amount: string;
  method: (typeof PAYMENT_METHOD)[number];
  status: (typeof PAYMENT_STATUS)[number];
  paidAt: string;
  reference: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const empty: FormState = {
  invoiceId: "",
  amount: "",
  method: "bank",
  status: "paid",
  paidAt: "",
  reference: "",
};

export interface PaymentFormProps {
  initial?: Partial<FormState>;
  submitLabel: string;
  onSubmit: (input: PaymentCreateInput) => Promise<unknown>;
  onCancel?: () => void;
  busy?: boolean;
  lockInvoice?: boolean;
  /** When set, the invoice dropdown is scoped to this client's invoices only. */
  clientId?: string;
}

export function PaymentForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
  lockInvoice,
  clientId,
}: PaymentFormProps) {
  // `paidAt` is computed at mount (not module-load) so a long-lived tab never
  // defaults a payment to a stale/previous day.
  const [values, setValues] = useState<FormState>(() => ({ ...empty, paidAt: today(), ...initial }));
  const [error, setError] = useState<string | null>(null);
  const invoices = useInvoices();

  const invoiceOptions = useMemo(() => {
    const all = invoices.data ?? [];
    return clientId ? all.filter((i) => i.client.id === clientId) : all;
  }, [invoices.data, clientId]);

  const selectedInvoice = useMemo(
    () => invoiceOptions.find((i) => i.id === values.invoiceId),
    [invoiceOptions, values.invoiceId],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.invoiceId) return setError("Please select an invoice");
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Amount must be greater than zero");

    const payload: PaymentCreateInput = {
      invoiceId: values.invoiceId,
      amount,
      method: values.method,
      status: values.status,
      paidAt: values.paidAt ? new Date(values.paidAt) : undefined,
      reference: values.reference.trim() || undefined,
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
          Invoice<span className="ml-0.5 text-red-600">*</span>
        </Label>
        <Select
          value={values.invoiceId}
          onChange={(e) => set("invoiceId", e.target.value)}
          disabled={lockInvoice}
        >
          <option value="">
            {invoices.isLoading
              ? "Loading…"
              : invoiceOptions.length === 0
                ? "No invoices for this client"
                : "Select an invoice"}
          </option>
          {invoiceOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {clientId
                ? `${i.number} · ${formatINR(i.total)} · ${i.status}`
                : `${i.number} · ${i.client.name} · ${formatINR(i.total)}`}
            </option>
          ))}
        </Select>
        {selectedInvoice && (
          <p className="text-xs text-muted-foreground">
            Invoice total: <span className="font-medium">{formatINR(selectedInvoice.total)}</span>
            {" · status: "}
            <span className="font-medium capitalize">{selectedInvoice.status}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>
            Amount (₹)<span className="ml-0.5 text-red-600">*</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
          />
          {selectedInvoice && !values.amount && (
            <button
              type="button"
              onClick={() => set("amount", selectedInvoice.total)}
              className="text-xs text-primary hover:underline"
            >
              Fill full amount ({formatINR(selectedInvoice.total)})
            </button>
          )}
        </div>

        <div className="space-y-1">
          <Label>Method</Label>
          <Select value={values.method} onChange={(e) => set("method", e.target.value as FormState["method"])}>
            {PAYMENT_METHOD.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </Select>
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
          <Label>Paid on</Label>
          <Input type="date" value={values.paidAt} onChange={(e) => set("paidAt", e.target.value)} />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label>Reference</Label>
          <Input
            value={values.reference}
            onChange={(e) => set("reference", e.target.value)}
            placeholder="e.g. UPI txn ID, cheque no."
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
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
