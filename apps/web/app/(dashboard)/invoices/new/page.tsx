"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { isOffline } from "@/lib/offline";
import { InvoiceForm } from "../_components/invoice-form";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const create = useCreateInvoice();
  const clientId = params.get("clientId") ?? undefined;

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
        <h1 className="text-xl font-semibold sm:text-2xl">New invoice</h1>
        <p className="text-sm text-muted-foreground">Create a tax invoice, quotation, estimate, or receipt.</p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <InvoiceForm
            submitLabel="Create invoice"
            busy={create.isPending}
            initial={clientId ? { clientId } : undefined}
            lockClient={Boolean(clientId)}
            onCancel={() => router.push("/invoices")}
            onSubmit={async (input) => {
              const p = create.mutateAsync(input);
              if (isOffline()) {
                // Queued offline — the new id isn't known yet, so go to the list.
                p.catch(() => undefined);
                router.push("/invoices");
                return;
              }
              const created = await p;
              router.push(`/invoices/${created.id}`);
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
