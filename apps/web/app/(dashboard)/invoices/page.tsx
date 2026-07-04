"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { PAYMENT_STATUS } from "@audithub/types";
import { useDeleteInvoice, useInvoices } from "@/hooks/use-invoices";
import { formatDate, formatINR } from "@/lib/format";
import { PaymentStatusBadge } from "./_components/status-badge";

export default function InvoicesPage() {
  const { data, isLoading, isError, error, refetch } = useInvoices();
  const del = useDeleteInvoice();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | (typeof PAYMENT_STATUS)[number]>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((i) => {
      if (status !== "all" && i.status !== status) return false;
      if (!q) return true;
      return (
        i.number.toLowerCase().includes(q) || i.client.name.toLowerCase().includes(q)
      );
    });
  }, [data, query, status]);

  const totals = useMemo(() => {
    if (!data) return { billed: 0, outstanding: 0 };
    let billed = 0;
    let outstanding = 0;
    for (const i of data) {
      const total = Number(i.total);
      billed += total;
      if (i.status !== "paid") outstanding += total;
    }
    return { billed, outstanding };
  }, [data]);

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Delete invoice ${number}?`)) return;
    await del.mutateAsync(id);
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} record${data.length === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        <Link href="/invoices/new">
          <Button>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total billed</div>
          <div className="mt-1 text-xl font-semibold">{formatINR(totals.billed)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Outstanding</div>
          <div className="mt-1 text-xl font-semibold">{formatINR(totals.outstanding)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Records</div>
          <div className="mt-1 text-xl font-semibold">{data?.length ?? "—"}</div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number or client…"
            className="w-72 pl-8"
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
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load invoices: {error instanceof Error ? error.message : "Unknown"}{" "}
          <Button variant="link" onClick={() => refetch()} className="h-auto p-0 text-red-700">
            Retry
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading invoices…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {data?.length ? "No invoices match your filters." : "No invoices yet."}
          </p>
          {!data?.length && (
            <Link href="/invoices/new">
              <Button className="mt-4">
                <Plus className="h-4 w-4" />
                Create your first invoice
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${i.id}`} className="font-medium hover:underline">
                      {i.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{i.client.name}</td>
                  <td className="px-4 py-3 capitalize">{i.kind}</td>
                  <td className="px-4 py-3">{formatDate(i.issuedAt)}</td>
                  <td className="px-4 py-3">{formatDate(i.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatINR(i.total)}</td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={i.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(i.id, i.number)}
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
    </section>
  );
}
