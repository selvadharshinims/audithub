"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-dashboard";
import { formatDate, formatINR, formatINRWhole } from "@/lib/format";
import { ComplianceTypeBadge } from "../compliance/_components/type-badge";
import { KpiCard } from "./_components/kpi-card";
import { RevenueChart } from "./_components/revenue-chart";
import { ClientsChart } from "./_components/clients-chart";

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load dashboard: {error instanceof Error ? error.message : "Unknown"}
      </Card>
    );
  }

  const { kpis, revenueByMonth, clientsByMonth, upcomingReminders, recentActivity, meta } = data;
  const fyStart = new Date(meta.financialYear.start);
  const fyEnd = new Date(meta.financialYear.end);
  const fyLabel = `FY ${fyStart.getFullYear()}-${String(fyEnd.getFullYear()).slice(-2)}`;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold sm:text-2xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Practice overview · {fyLabel}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Clients" value={String(kpis.totalClients)} icon={Users} />
        <KpiCard
          label="Open tasks"
          value={String(kpis.openTasks)}
          icon={ClipboardList}
          tone="warning"
        />
        <KpiCard
          label="Outstanding dues"
          value={formatINRWhole(kpis.outstandingDues)}
          icon={Wallet}
          tone="warning"
        />
        <KpiCard
          label={`Revenue ${fyLabel}`}
          value={formatINRWhole(kpis.revenueFY)}
          icon={IndianRupee}
          tone="success"
        />
        <KpiCard
          label="Overdue invoices"
          value={String(kpis.overdueInvoices)}
          icon={AlertTriangle}
          tone="danger"
        />
        <KpiCard
          label="Completed (30d)"
          value={String(kpis.completedTasks30d)}
          icon={CheckCircle2}
          tone="success"
          hint="Tasks marked done"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue &amp; billing (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueByMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Client growth (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientsChart data={clientsByMonth} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming deadlines (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due in the next 30 days.</p>
            ) : (
              <ul className="divide-y">
                {upcomingReminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.title ?? `${r.type} · ${r.client.name}`}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          <Link href={`/clients/${r.client.id}`} className="hover:underline">
                            {r.client.name}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ComplianceTypeBadge type={r.type} />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.dueDate)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="divide-y">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div>
                        <span className="font-medium">{a.actor?.name ?? "System"}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>{" "}
                        <span className="font-medium">{a.entity}</span>
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
