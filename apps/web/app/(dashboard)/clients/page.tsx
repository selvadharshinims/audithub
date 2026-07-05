"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { TableScroll, MobileList, Field } from "@/components/ui/responsive-table";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { isOffline } from "@/lib/offline";
import { ClientStatusBadge } from "./_components/status-badge";

export default function ClientsPage() {
  const { data, isLoading, isError, error, refetch } = useClients();
  const del = useDeleteClient();
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((c) =>
      [c.name, c.pan, c.gstin, c.email, c.mobile]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [data, query]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
    } catch (err) {
      if (!isOffline()) alert(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} client${data.length === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, PAN, GSTIN…"
              className="w-full pl-8 md:w-72"
            />
          </div>
          <Link href="/clients/new" className="w-full md:w-auto">
            <Button className="w-full md:w-auto">
              <Plus className="h-4 w-4" />
              New client
            </Button>
          </Link>
        </div>
      </header>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load clients: {error instanceof Error ? error.message : "Unknown error"}{" "}
          <Button variant="link" onClick={() => refetch()} className="h-auto p-0 text-red-700">
            Retry
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading clients…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {data?.length ? "No clients match your search." : "No clients yet."}
          </p>
          {!data?.length && (
            <Link href="/clients/new">
              <Button className="mt-4">
                <Plus className="h-4 w-4" />
                Add your first client
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          {/* DESKTOP TABLE (md+) */}
          <TableScroll>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Name</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">PAN</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">GSTIN</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Mobile</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.pan ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.gstin ?? "—"}</td>
                    <td className="px-4 py-3">{c.mobile ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ClientStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        className="tap-target"
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          {/* MOBILE CARDS (below md) */}
          <MobileList>
            {filtered.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.email && (
                      <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ClientStatusBadge status={c.status} />
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      className="tap-target"
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={del.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 border-t pt-3">
                  <Field label="PAN">
                    <span className="font-mono text-xs">{c.pan ?? "—"}</span>
                  </Field>
                  <Field label="GSTIN">
                    <span className="font-mono text-xs">{c.gstin ?? "—"}</span>
                  </Field>
                  <Field label="Mobile">{c.mobile ?? "—"}</Field>
                </div>
              </Card>
            ))}
          </MobileList>
        </>
      )}
    </section>
  );
}
