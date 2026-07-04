"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { ClientStatusBadge } from "./_components/status-badge";

export default function ClientsPage() {
  const { data, isLoading, isError, error, refetch } = useClients();
  const del = useDeleteClient();
  const [query, setQuery] = useState("");

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
    await del.mutateAsync(id);
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} client${data.length === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, PAN, GSTIN…"
              className="w-72 pl-8"
            />
          </div>
          <Link href="/clients/new">
            <Button>
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
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">PAN</th>
                <th className="px-4 py-3 font-medium">GSTIN</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Status</th>
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
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={del.isPending}
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
