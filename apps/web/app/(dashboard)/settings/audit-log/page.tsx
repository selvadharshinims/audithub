"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Field, MobileList, TableScroll } from "@/components/ui/responsive-table";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { useMe } from "@/hooks/use-me";
import { useUsers } from "@/hooks/use-users";

function toISO(d: string, endOfDay = false): string | undefined {
  if (!d) return undefined;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return undefined;
  if (endOfDay) dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditLogPage() {
  const me = useMe();
  const users = useUsers();
  const [entity, setEntity] = useState("");
  const [actorId, setActorId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const isSuperAdmin = me.data?.role.name === "super_admin";

  const filter = useMemo(
    () => ({
      entity: entity || undefined,
      actorId: actorId || undefined,
      from: toISO(from),
      to: toISO(to, true),
      limit: 200,
    }),
    [entity, actorId, from, to],
  );

  const { data, isLoading, isError, error } = useActivityLogs(filter);

  if (me.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isSuperAdmin) {
    return (
      <section className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          The audit log is only visible to super admins.
        </Card>
      </section>
    );
  }

  const clearFilters = () => {
    setEntity("");
    setActorId("");
    setFrom("");
    setTo("");
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.rows.length} entries` : " "} · Most recent first
          </p>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Entity</Label>
            <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">All</option>
              {data?.entities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Actor</Label>
            <Select value={actorId} onChange={(e) => setActorId(e.target.value)}>
              <option value="">All</option>
              {users.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load audit log"}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading entries…</Card>
      ) : !data?.rows.length ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No activity found for the current filters.
        </Card>
      ) : (
        <>
          {/* DESKTOP TABLE (md+) */}
          <TableScroll>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">When</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Actor</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Action</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Entity</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Ref</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Meta</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const metaKeys = r.meta ? Object.keys(r.meta) : [];
                  const isExpanded = expanded === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                      className="cursor-pointer border-b align-top last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatTimestamp(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {r.actor ? (
                          <div>
                            <div className="font-medium">{r.actor.name}</div>
                            <div className="text-xs text-muted-foreground">{r.actor.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
                      <td className="px-4 py-3">{r.entity}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.entityId ? r.entityId.slice(0, 8) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {metaKeys.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : isExpanded ? (
                          <pre className="max-w-xs overflow-x-auto rounded bg-muted p-2 text-[11px]">
                            {JSON.stringify(r.meta, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {metaKeys.slice(0, 3).join(", ")}
                            {metaKeys.length > 3 ? "…" : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>

          {/* MOBILE CARDS (below md) */}
          <MobileList>
            {data.rows.map((r) => {
              const metaKeys = r.meta ? Object.keys(r.meta) : [];
              const isExpanded = expanded === r.id;
              return (
                <Card
                  key={r.id}
                  onClick={() => setExpanded((cur) => (cur === r.id ? null : r.id))}
                  className="cursor-pointer p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {r.actor ? (
                        <>
                          <div className="truncate font-medium">{r.actor.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {r.actor.email}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </div>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">
                      {formatTimestamp(r.createdAt)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 border-t pt-3">
                    <Field label="Action">
                      <span className="font-mono text-xs">{r.action}</span>
                    </Field>
                    <Field label="Entity">{r.entity}</Field>
                    <Field label="Ref">
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.entityId ? r.entityId.slice(0, 8) : "—"}
                      </span>
                    </Field>
                    {metaKeys.length === 0 ? (
                      <Field label="Meta">
                        <span className="text-xs text-muted-foreground">—</span>
                      </Field>
                    ) : isExpanded ? (
                      <div className="py-0.5">
                        <div className="text-sm text-muted-foreground">Meta</div>
                        <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify(r.meta, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <Field label="Meta">
                        <span className="text-xs text-muted-foreground">
                          {metaKeys.slice(0, 3).join(", ")}
                          {metaKeys.length > 3 ? "…" : ""}
                        </span>
                      </Field>
                    )}
                  </div>
                </Card>
              );
            })}
          </MobileList>
        </>
      )}
    </section>
  );
}
