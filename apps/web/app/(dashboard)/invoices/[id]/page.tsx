"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Mail, Plus, Trash2 } from "lucide-react";
import { PAYMENT_STATUS, type PaymentStatus } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  downloadInvoicePdf,
  useDeleteInvoice,
  useInvoice,
  useSendInvoice,
  useUpdateInvoice,
} from "@/hooks/use-invoices";
import { ApiError } from "@/lib/api";
import { useCreatePayment } from "@/hooks/use-payments";
import { formatDate, formatINR } from "@/lib/format";
import { PaymentStatusBadge } from "../_components/status-badge";
import { PaymentForm } from "../../payments/_components/payment-form";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError, error } = useInvoice(id);
  const update = useUpdateInvoice(id);
  const del = useDeleteInvoice();
  const createPayment = useCreatePayment();
  const sendInvoice = useSendInvoice(id);
  const [recording, setRecording] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : "Invoice not found"}
      </Card>
    );
  }

  async function handleDelete() {
    if (!confirm(`Delete invoice ${data!.number}?`)) return;
    await del.mutateAsync(id);
    router.push("/invoices");
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{data.number}</h1>
              <PaymentStatusBadge status={data.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link href={`/clients/${data.client.id}`} className="hover:underline">
                {data.client.name}
              </Link>
              {" · "}
              <span className="capitalize">{data.kind}</span>
              {" · issued "}
              {formatDate(data.issuedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={data.status}
              onChange={async (e) => {
                await update.mutateAsync({ status: e.target.value as PaymentStatus });
              }}
              disabled={update.isPending}
              className="w-36"
            >
              {PAYMENT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await downloadInvoicePdf(data.id, data.number);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Download failed");
                }
              }}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              variant="outline"
              disabled={sendInvoice.isPending}
              onClick={async () => {
                const to = prompt(
                  "Send invoice PDF to:",
                  (data as unknown as { client: { email?: string | null } }).client.email ?? "",
                );
                if (to === null) return;
                try {
                  const res = await sendInvoice.mutateAsync(to.trim() || undefined);
                  alert(`Invoice emailed to ${res.to}. (Check the API server logs for the stub delivery.)`);
                } catch (err) {
                  const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Send failed";
                  alert(msg);
                }
              }}
            >
              <Mail className="h-4 w-4" />
              {sendInvoice.isPending ? "Sending…" : "Email"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Amount breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              <Row label="Subtotal" value={formatINR(data.subtotal)} />
              <Row label="CGST" value={formatINR(data.cgst)} />
              <Row label="SGST" value={formatINR(data.sgst)} />
              <Row label="IGST" value={formatINR(data.igst)} />
              <Row label="Tax total" value={formatINR(data.tax)} />
              <Row label="Due date" value={formatDate(data.dueDate)} />
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t pt-4">
              <span className="text-sm uppercase text-muted-foreground">Grand total</span>
              <span className="text-2xl font-semibold">{formatINR(data.total)}</span>
            </div>
            {data.description && (
              <div className="mt-4 border-t pt-4">
                <div className="text-xs uppercase text-muted-foreground">Description</div>
                <p className="text-sm">{data.description}</p>
              </div>
            )}
            {data.notes && (
              <div className="mt-4 border-t pt-4">
                <div className="text-xs uppercase text-muted-foreground">Notes</div>
                <p className="whitespace-pre-wrap text-sm">{data.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bill to</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">{data.client.name}</div>
              {data.client.gstin && <div className="font-mono text-xs">GSTIN {data.client.gstin}</div>}
              {data.client.pan && <div className="font-mono text-xs">PAN {data.client.pan}</div>}
              {data.client.address && <div className="text-muted-foreground">{data.client.address}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Payments</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setRecording(true)}>
                <Plus className="h-3.5 w-3.5" />
                Record
              </Button>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {data.payments.length === 0
                ? "No payments recorded."
                : data.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b py-2 last:border-b-0">
                      <div>
                        <div className="font-medium text-foreground">{formatINR(p.amount)}</div>
                        <div className="text-xs">
                          {p.method} · {formatDate(p.paidAt)}
                        </div>
                      </div>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                  ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={recording} onClose={() => setRecording(false)} title="Record payment">
        {recording && (
          <PaymentForm
            submitLabel="Save payment"
            busy={createPayment.isPending}
            initial={{ invoiceId: id, amount: data.total }}
            lockInvoice
            onCancel={() => setRecording(false)}
            onSubmit={async (input) => {
              await createPayment.mutateAsync(input);
              setRecording(false);
            }}
          />
        )}
      </Modal>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
