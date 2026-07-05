"use client";

import { useState } from "react";
import { ClientCreateSchema, CLIENT_STATUS, type ClientCreateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";

type FormState = {
  name: string;
  pan: string;
  gstin: string;
  aadhaar: string;
  mobile: string;
  email: string;
  address: string;
  notes: string;
  status: (typeof CLIENT_STATUS)[number];
};

const empty: FormState = {
  name: "",
  pan: "",
  gstin: "",
  aadhaar: "",
  mobile: "",
  email: "",
  address: "",
  notes: "",
  status: "active",
};

export interface ClientFormProps {
  initial?: Partial<FormState>;
  submitLabel: string;
  onSubmit: (input: ClientCreateInput) => Promise<unknown>;
  onCancel?: () => void;
  busy?: boolean;
}

export function ClientForm({ initial, submitLabel, onSubmit, onCancel, busy }: ClientFormProps) {
  const [values, setValues] = useState<FormState>({ ...empty, ...initial });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const parsed = ClientCreateSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError) setFormError(err.message);
      else if (err instanceof Error) setFormError(err.message);
      else setFormError("Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Client name" error={fieldErrors.name} required>
          <Input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Acme Traders Pvt. Ltd."
          />
        </Field>

        <Field label="Status" error={fieldErrors.status}>
          <Select value={values.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
            {CLIENT_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="PAN" error={fieldErrors.pan}>
          <Input
            value={values.pan}
            onChange={(e) => set("pan", e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
          />
        </Field>

        <Field label="GSTIN" error={fieldErrors.gstin}>
          <Input
            value={values.gstin}
            onChange={(e) => set("gstin", e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
          />
        </Field>

        <Field label="Aadhaar" error={fieldErrors.aadhaar}>
          <Input value={values.aadhaar} onChange={(e) => set("aadhaar", e.target.value)} placeholder="1234 5678 9012" />
        </Field>

        <Field label="Mobile" error={fieldErrors.mobile}>
          <Input
            type="tel"
            value={values.mobile}
            onChange={(e) => set("mobile", e.target.value)}
            placeholder="+91 98765 43210"
          />
        </Field>

        <Field label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="client@example.com"
          />
        </Field>

        <Field label="Address" error={fieldErrors.address} className="sm:col-span-2">
          <Textarea
            value={values.address}
            onChange={(e) => set("address", e.target.value)}
            rows={2}
            placeholder="Street, city, state, PIN"
          />
        </Field>

        <Field label="Notes" error={fieldErrors.notes} className="sm:col-span-2">
          <Textarea
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Internal notes"
          />
        </Field>
      </section>

      {formError && <p className="text-sm text-red-600">{formError}</p>}

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

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ? `space-y-1 ${className}` : "space-y-1"}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
