"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  IndianRupee,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PAYMENT_METHOD } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Field, MobileList } from "@/components/ui/responsive-table";
import { useClientFinance } from "@/hooks/use-clients";
import {
  useCreateInvoice,
  useDeleteInvoice,
  useInvoice,
  useUpdateInvoice,
} from "@/hooks/use-invoices";
import {
  useCreatePayment,
  useDeletePayment,
  useUpdatePayment,
} from "@/hooks/use-payments";
import { formatDate, formatINR } from "@/lib/format";
import { isOffline } from "@/lib/offline";
import type { ClientFinancePayment } from "@/types/client";
import type { InvoiceDetail } from "@/types/invoice";
import { InvoiceForm } from "../../../invoices/_components/invoice-form";
import { PaymentStatusBadge } from "../../../invoices/_components/status-badge";
import { PaymentForm } from "../../../payments/_components/payment-form";

type ModalState =
  | { kind: "closed" }
  | { kind: "invoice-create" }
  | { kind: "payment-create" }
  | { kind: "invoice-edit"; id: string }
  | { kind: "payment-edit"; payment: ClientFinancePayment };

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
  const deleteInvoice = useDeleteInvoice();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });

  // Edits/deletes made here must refresh THIS view — the invoice/payment hooks
  // only invalidate the global lists + dashboard, not the client finance query.
  const refreshFinance = () =>
    qc.invalidateQueries({ queryKey: ["clients", clientId, "finance"] });

  const close = () => setModal({ kind: "closed" });

  async function handleDeleteInvoice(id: string, number: string) {
    if (!confirm(`Delete invoice ${number}? This also removes its payments.`)) return;
    const p = deleteInvoice.mutateAsync(id);
    if (isOffline()) {
      p.then(refreshFinance).catch(() => undefined);
      return;
    }
    try {
      await p;
      await refreshFinance();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  }

  async function handleDeletePayment(payment: ClientFinancePayment) {
    if (!confirm(`Delete this ${formatINR(payment.amount)} payment on ${payment.invoice.number}?`))
      return;
    const p = deletePayment.mutateAsync(payment.id);
    if (isOffline()) {
      p.then(refreshFinance).catch(() => undefined);
      return;
    }
    try {
      await p;
      await refreshFinance();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete payment");
    }
  }

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
            onClick={() => setModal({ kind: "payment-create" })}
            disabled={summary.invoiceCount === 0}
            title={summary.invoiceCount === 0 ? "Create an invoice first" : "Record a payment"}
          >
            <Wallet className="h-4 w-4" />
            Record payment
          </Button>
          <Button size="sm" onClick={() => setModal({ kind: "invoice-create" })}>
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
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Invoice</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Paid</th>
                      <th className="px-3 py-2 text-right font-medium">Balance</th>
                      <th className="px-3 py-2 font-medium">Due</th>
                      <th className="w-24 px-3 py-2" />
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
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="tap-target"
                              title="Edit invoice"
                              onClick={() => setModal({ kind: "invoice-edit", id: inv.id })}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="tap-target"
                              title="Delete invoice"
                              disabled={deleteInvoice.isPending}
                              onClick={() => handleDeleteInvoice(inv.id, inv.number)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
                    <div className="mt-3 flex gap-2 border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setModal({ kind: "invoice-edit", id: inv.id })}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive"
                        disabled={deleteInvoice.isPending}
                        onClick={() => handleDeleteInvoice(inv.id, inv.number)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
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
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Invoice</th>
                      <th className="px-3 py-2 font-medium">Method</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="w-24 px-3 py-2" />
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
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="tap-target"
                              title="Edit payment"
                              onClick={() => setModal({ kind: "payment-edit", payment: p })}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="tap-target"
                              title="Delete payment"
                              disabled={deletePayment.isPending}
                              onClick={() => handleDeletePayment(p)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
                    <div className="mt-3 flex gap-2 border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setModal({ kind: "payment-edit", payment: p })}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive"
                        disabled={deletePayment.isPending}
                        onClick={() => handleDeletePayment(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </MobileList>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create invoice */}
      <Modal
        open={modal.kind === "invoice-create"}
        onClose={close}
        title="New invoice"
        description="Billed to this client."
        className="sm:max-w-2xl"
      >
        <InvoiceForm
          submitLabel="Create invoice"
          busy={createInvoice.isPending}
          initial={{ clientId }}
          lockClient
          onCancel={close}
          onSubmit={async (input) => {
            const p = createInvoice.mutateAsync(input);
            if (isOffline()) {
              p.then(refreshFinance).catch(() => undefined);
              close();
              return;
            }
            await p;
            // Close now; let the finance list refetch in the background so the
            // modal doesn't sit on "Saving…" through the round-trip.
            close();
            refreshFinance();
          }}
        />
      </Modal>

      {/* Edit invoice — loads full detail then prefills the form */}
      {modal.kind === "invoice-edit" && (
        <InvoiceEditModal
          invoiceId={modal.id}
          onClose={close}
          onSaved={refreshFinance}
        />
      )}

      {/* Create payment */}
      <Modal
        open={modal.kind === "payment-create"}
        onClose={close}
        title="Record payment"
        description="Against one of this client's invoices."
      >
        <PaymentForm
          submitLabel="Record payment"
          busy={createPayment.isPending}
          clientId={clientId}
          onCancel={close}
          onSubmit={async (input) => {
            const p = createPayment.mutateAsync(input);
            if (isOffline()) {
              p.then(refreshFinance).catch(() => undefined);
              close();
              return;
            }
            await p;
            // Close now; let the finance list refetch in the background so the
            // modal doesn't sit on "Saving…" through the round-trip.
            close();
            refreshFinance();
          }}
        />
      </Modal>

      {/* Edit payment — invoice locked so the backend recompute stays correct */}
      <Modal
        open={modal.kind === "payment-edit"}
        onClose={close}
        title="Edit payment"
        description="Correct a recorded payment."
      >
        {modal.kind === "payment-edit" && (
          <PaymentForm
            submitLabel="Save changes"
            busy={updatePayment.isPending}
            clientId={clientId}
            lockInvoice
            initial={{
              invoiceId: modal.payment.invoice.id,
              amount: modal.payment.amount,
              method: modal.payment.method as (typeof PAYMENT_METHOD)[number],
              status: modal.payment.status,
              paidAt: modal.payment.paidAt ? modal.payment.paidAt.slice(0, 10) : "",
              reference: modal.payment.reference ?? "",
            }}
            onCancel={close}
            onSubmit={async (input) => {
              const paymentId = modal.payment.id;
              const p = updatePayment.mutateAsync({ id: paymentId, input });
              if (isOffline()) {
                p.then(refreshFinance).catch(() => undefined);
                close();
                return;
              }
              await p;
              close();
              refreshFinance();
            }}
          />
        )}
      </Modal>
    </section>
  );
}

function invoiceToFormInitial(inv: InvoiceDetail) {
  const sub = Number(inv.subtotal) || 0;
  // Reverse the stored GST amounts back into the rates the form edits.
  const rate = (amount: string | null) =>
    sub > 0 ? String(Math.round((Number(amount ?? 0) / sub) * 10000) / 100) : "0";
  return {
    clientId: inv.client.id,
    number: inv.number,
    kind: inv.kind,
    description: inv.description ?? "",
    issuedAt: inv.issuedAt.slice(0, 10),
    dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : "",
    subtotal: inv.subtotal,
    cgstRate: rate(inv.cgst),
    sgstRate: rate(inv.sgst),
    igstRate: rate(inv.igst),
    status: inv.status,
    notes: inv.notes ?? "",
  };
}

function InvoiceEditModal({
  invoiceId,
  onClose,
  onSaved,
}: {
  invoiceId: string;
  onClose: () => void;
  onSaved: () => void | Promise<unknown>;
}) {
  const { data, isLoading, isError } = useInvoice(invoiceId);
  const update = useUpdateInvoice(invoiceId);

  return (
    <Modal open onClose={onClose} title="Edit invoice" className="sm:max-w-2xl">
      {isLoading || !data ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {isError ? "Failed to load invoice." : "Loading invoice…"}
        </p>
      ) : (
        <InvoiceForm
          submitLabel="Save changes"
          busy={update.isPending}
          lockClient
          initial={invoiceToFormInitial(data)}
          onCancel={onClose}
          onSubmit={async (input) => {
            const p = update.mutateAsync(input);
            if (isOffline()) {
              p.then(onSaved).catch(() => undefined);
              onClose();
              return;
            }
            await p;
            onClose();
            onSaved();
          }}
        />
      )}
    </Modal>
  );
}
