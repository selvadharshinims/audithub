"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/use-notifications";

type Filter = "all" | "unread";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { data, isLoading, isError, error } = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (!data) return [];
    return filter === "unread" ? data.filter((n) => !n.readAt) : data;
  }, [data, filter]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread.data?.count ?? 0} unread · {data?.length ?? 0} total
          </p>
        </div>
        {(unread.data?.count ?? 0) > 0 && (
          <Button
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="w-full md:w-auto"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </header>

      <div className="flex rounded-md border p-0.5 w-fit">
        {(["all", "unread"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium capitalize",
              filter === f ? "bg-muted" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load notifications"}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {filter === "unread" ? "No unread notifications." : "You have no notifications yet."}
        </Card>
      ) : (
        <Card className="divide-y">
          {rows.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between",
                !n.readAt && "bg-primary/[.03]",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "mt-1 inline-block h-2 w-2 shrink-0 rounded-full",
                    n.readAt ? "bg-transparent" : "bg-primary",
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && (
                    <div
                      className="mt-1 break-words text-xs text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: n.body }}
                    />
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {formatTimestamp(n.createdAt)}
                    {n.readAt && ` · read ${formatTimestamp(n.readAt)}`}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-5 sm:pl-0">
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tap-target"
                    onClick={() => markRead.mutate(n.id)}
                  >
                    Mark read
                  </Button>
                )}
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={() => !n.readAt && markRead.mutate(n.id)}
                    className="tap-target inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
