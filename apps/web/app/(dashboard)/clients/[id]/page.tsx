"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClient, useDeleteClient, useUpdateClient } from "@/hooks/use-clients";
import { ClientForm } from "../_components/client-form";
import { ClientStatusBadge } from "../_components/status-badge";
import { CompaniesSection } from "./_components/companies-section";
import { DocumentsSection } from "./_components/documents-section";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, isError, error } = useClient(id);
  const update = useUpdateClient(id);
  const del = useDeleteClient();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error instanceof Error ? error.message : "Client not found"}
      </Card>
    );
  }

  async function handleDelete() {
    if (!confirm(`Delete "${data!.name}"? This cannot be undone.`)) return;
    await del.mutateAsync(id);
    router.push("/clients");
  }

  const rows: Array<[string, string | null]> = [
    ["PAN", data.pan],
    ["GSTIN", data.gstin],
    ["Aadhaar", data.aadhaar],
    ["Mobile", data.mobile],
    ["Email", data.email],
    ["Address", data.address],
  ];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{data.name}</h1>
              <ClientStatusBadge status={data.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created {new Date(data.createdAt).toLocaleDateString()}
            </p>
          </div>
          {!editing && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </header>

      {editing ? (
        <Card>
          <CardContent className="pt-6">
            <ClientForm
              submitLabel="Save changes"
              busy={update.isPending}
              initial={{
                name: data.name,
                pan: data.pan ?? "",
                gstin: data.gstin ?? "",
                aadhaar: data.aadhaar ?? "",
                mobile: data.mobile ?? "",
                email: data.email ?? "",
                address: data.address ?? "",
                notes: data.notes ?? "",
                status: data.status,
              }}
              onCancel={() => setEditing(false)}
              onSubmit={async (input) => {
                await update.mutateAsync(input);
                setEditing(false);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
                    <dd className="text-sm">{value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
              {data.notes && (
                <div className="mt-4 border-t pt-4">
                  <dt className="text-xs uppercase text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap text-sm">{data.notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <CompaniesSection clientId={id} />
          </div>
        </div>
      )}

      {!editing && <DocumentsSection clientId={id} />}
    </section>
  );
}
