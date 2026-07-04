"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  useCreatePayment,
  useDeletePayment,
  usePayments,
} from "@/hooks/use-payments";
import { formatDate, formatINR } from "@/lib/format";
import { PaymentStatusBadge } from "../invoices/_components/status-badge";
import { PaymentForm } from "./_components/payment-form";

export default function PaymentsPage() {
  const { data, isLoading, isError, error, refetch } = usePayments();
  const create = useCreatePayment();
  const del = useDeletePayment();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | (typeof PAYMENT_STATUS)[number]>("all");
  const [method, setMethod] = useState<"all" | (typeof PAYMENT_METHOD)[number]>("all");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (method !== "all" && p.method !== method) return false;
      if (!q) return true;
      return (
        p.invoice.number.toLowerCase().includes(q) ||
        p.invoice.client.name.toLowerCase().includes(q) ||
        (p.reference ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, query, status, method]);

  const totals = useMemo(() => {
    if (!data) return { collected: 0, pending: 0, count: 0 };
    let collected = 0;
    let pending = 0;
    for (const p of data) {
      const amt = Number(p.amount);
      if (p.status === "paid") collected += amt;
      else pending += amt;
    }
    return { collected, pending, count: data.length };
  }, [data]);

  async function handleDelete(id: string, invoiceNumber: string) {
    if (!confirm(`Delete payment for invoice ${invoiceNumber}?`)) return;
    await del.mutateAsync(id);
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} record${data.length === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Record payment
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Collected</div>
          <div className="mt-1 text-xl font-semibold">{formatINR(totals.collected)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Pending</div>
          <div className="mt-1 text-xl font-semibold">{formatINR(totals.pending)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Payments recorded</div>
          <div className="mt-1 text-xl font-semibold">{totals.count}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice, client or reference…"
            className="w-80 pl-8"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-40"
        >
          <option value="all">All statuses</option>
          {PAYMENT_STATUS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <Select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
          className="w-40"
        >
          <option value="all">All methods</option>
          {PAYMENT_METHOD.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load payments: {error instanceof Error ? error.message : "Unknown"}{" "}
          <Button variant="link" onClick={() => refetch()} className="h-auto p-0 text-red-700">
            Retry
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading payments…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {data?.length ? "No payments match your filters." : "No payments recorded yet."}
          </p>
          {!data?.length && (
            <Button className="mt-4" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Record your first payment
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Paid on</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{formatDate(p.paidAt ?? p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${p.invoice.id}`} className="font-medium hover:underline">
                      {p.invoice.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.invoice.client.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3 capitalize">{p.method}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id, p.invoice.number)}
                      disabled={del.isPending}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Record payment">
        {creating && (
          <PaymentForm
            submitLabel="Save payment"
            busy={create.isPending}
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              await create.mutateAsync(input);
              setCreating(false);
            }}
          />
        )}
      </Modal>
    </section>
  );
}
