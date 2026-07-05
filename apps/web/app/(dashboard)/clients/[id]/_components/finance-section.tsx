"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Plus, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Field, MobileList, TableScroll } from "@/components/ui/responsive-table";
import { useClientFinance } from "@/hooks/use-clients";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useCreatePayment } from "@/hooks/use-payments";
import { formatDate, formatINR } from "@/lib/format";
import { isOffline } from "@/lib/offline";
import { InvoiceForm } from "../../../invoices/_components/invoice-form";
import { PaymentStatusBadge } from "../../../invoices/_components/status-badge";
import { PaymentForm } from "../../../payments/_components/payment-form";

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Wallet;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const iconTone = {
    default: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    danger: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-4 shadow-premium-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className={`rounded-lg p-1.5 ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 break-words text-xl font-semibold leading-tight tracking-tight tabular-nums">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function FinanceSection({ clientId }: { clientId: string }) {
  const { data, isLoading, isError, error } = useClientFinance(clientId);
  const qc = useQueryClient();
  const createInvoice = useCreateInvoice();
  const createPayment = useCreatePayment();
  const [modal, setModal] = useState<"closed" | "invoice" | "payment">("closed");

  const refreshFinance = () =>
    qc.invalidateQueries({ queryKey: ["clients", clientId, "finance"] });

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">Loading billing…</Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load billing: {error instanceof Error ? error.message : "Unknown error"}
      </Card>
    );
  }

  const { summary, invoices, payments } = data;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Billing &amp; payments</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModal("payment")}
            disabled={summary.invoiceCount === 0}
            title={summary.invoiceCount === 0 ? "Create an invoice first" : "Record a payment"}
          >
            <Wallet className="h-4 w-4" />
            Record payment
          </Button>
          <Button size="sm" onClick={() => setModal("invoice")}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total billed"
          value={formatINR(summary.totalBilled)}
          sub={`${summary.invoiceCount} invoice${summary.invoiceCount === 1 ? "" : "s"}`}
          icon={ReceiptText}
        />
        <StatTile
          label="Received"
          value={formatINR(summary.totalPaid)}
          sub={`${summary.paymentCount} payment${summary.paymentCount === 1 ? "" : "s"}`}
          icon={TrendingUp}
          tone="success"
        />
        <StatTile
          label="Outstanding"
          value={formatINR(summary.totalOutstanding)}
          sub="Pending dues"
          icon={Wallet}
          tone={Number(summary.totalOutstanding) > 0 ? "warning" : "default"}
        />
        <StatTile
          label="Overdue"
          value={formatINR(summary.overdueAmount)}
          sub={`${summary.overdueCount} invoice${summary.overdueCount === 1 ? "" : "s"}`}
          icon={IndianRupee}
          tone={summary.overdueCount > 0 ? "danger" : "default"}
        />
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No invoices for this client yet.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Invoice</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Paid</th>
                      <th className="px-3 py-2 text-right font-medium">Balance</th>
                      <th className="px-3 py-2 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="py-2 pr-3">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-medium hover:underline"
                          >
                            {inv.number}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <PaymentStatusBadge status={inv.status} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatINR(inv.total)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-success">
                          {formatINR(inv.paid)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {formatINR(inv.balance)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <MobileList>
                {invoices.map((inv) => (
                  <Card key={inv.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-semibold hover:underline"
                      >
                        {inv.number}
                      </Link>
                      <PaymentStatusBadge status={inv.status} />
                    </div>
                    <div className="mt-3 space-y-1 border-t pt-3">
                      <Field label="Total">{formatINR(inv.total)}</Field>
                      <Field label="Paid">
                        <span className="text-success">{formatINR(inv.paid)}</span>
                      </Field>
                      <Field label="Balance">{formatINR(inv.balance)}</Field>
                      <Field label="Due">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</Field>
                    </div>
                  </Card>
                ))}
              </MobileList>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments received</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payments recorded for this client yet.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Invoice</th>
                      <th className="px-3 py-2 font-medium">Method</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="py-2 pr-3 text-muted-foreground">
                          {p.paidAt ? formatDate(p.paidAt) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/invoices/${p.invoice.id}`}
                            className="hover:underline"
                          >
                            {p.invoice.number}
                          </Link>
                        </td>
                        <td className="px-3 py-2 capitalize">{p.method}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.reference || "—"}</td>
                        <td className="px-3 py-2">
                          <PaymentStatusBadge status={p.status} />
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {formatINR(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <MobileList>
                {payments.map((p) => (
                  <Card key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold tabular-nums">{formatINR(p.amount)}</div>
                        <Link
                          href={`/invoices/${p.invoice.id}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {p.invoice.number}
                        </Link>
                      </div>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                    <div className="mt-3 space-y-1 border-t pt-3">
                      <Field label="Date">{p.paidAt ? formatDate(p.paidAt) : "—"}</Field>
                      <Field label="Method">
                        <span className="capitalize">{p.method}</span>
                      </Field>
                      <Field label="Reference">{p.reference || "—"}</Field>
                    </div>
                  </Card>
                ))}
              </MobileList>
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={modal === "invoice"}
        onClose={() => setModal("closed")}
        title="New invoice"
        description="Billed to this client."
        className="sm:max-w-2xl"
      >
        <InvoiceForm
          submitLabel="Create invoice"
          busy={createInvoice.isPending}
          initial={{ clientId }}
          lockClient
          onCancel={() => setModal("closed")}
          onSubmit={async (input) => {
            const p = createInvoice.mutateAsync(input);
            if (isOffline()) {
              // Queued offline — refresh once it replays; don't block the UI.
              p.then(refreshFinance).catch(() => undefined);
              setModal("closed");
              return;
            }
            await p;
            await refreshFinance();
            setModal("closed");
          }}
        />
      </Modal>

      <Modal
        open={modal === "payment"}
        onClose={() => setModal("closed")}
        title="Record payment"
        description="Against one of this client's invoices."
      >
        <PaymentForm
          submitLabel="Record payment"
          busy={createPayment.isPending}
          clientId={clientId}
          onCancel={() => setModal("closed")}
          onSubmit={async (input) => {
            const p = createPayment.mutateAsync(input);
            if (isOffline()) {
              p.then(refreshFinance).catch(() => undefined);
              setModal("closed");
              return;
            }
            await p;
            await refreshFinance();
            setModal("closed");
          }}
        />
      </Modal>
    </section>
  );
}
