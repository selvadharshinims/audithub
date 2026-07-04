"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatINR } from "@/lib/format";
import { downloadReport, useReport } from "@/hooks/use-reports";
import {
  REPORT_LABEL,
  REPORT_TYPES,
  type ClientPerformanceRow,
  type GstRow,
  type OutstandingRow,
  type ReportType,
  type RevenueRow,
} from "@/types/report";
import { cn } from "@/lib/utils";

function iso(d: Date): string {
  return d.toISOString();
}

function defaultRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth() - 11, 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("revenue");
  const [range, setRange] = useState(defaultRange);
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const rangeIso = useMemo(() => ({ from: iso(range.from), to: iso(range.to) }), [range]);
  const { data, isLoading, isError, error } = useReport(type, rangeIso);

  async function handleDownload(format: "xlsx" | "pdf") {
    setBusy(format);
    try {
      await downloadReport(type, format, rangeIso);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Revenue, outstanding, GST breakup, client performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleDownload("xlsx")} disabled={busy !== null || isLoading}>
            <FileSpreadsheet className="h-4 w-4" />
            {busy === "xlsx" ? "…" : "Excel"}
          </Button>
          <Button variant="outline" onClick={() => handleDownload("pdf")} disabled={busy !== null || isLoading}>
            <FileText className="h-4 w-4" />
            {busy === "pdf" ? "…" : "PDF"}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex rounded-md border p-0.5">
          {REPORT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium",
                type === t ? "bg-muted" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {REPORT_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={toInputDate(range.from)}
            onChange={(e) => setRange((r) => ({ ...r, from: new Date(e.target.value) }))}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={toInputDate(range.to)}
            onChange={(e) =>
              setRange((r) => ({
                ...r,
                to: new Date(new Date(e.target.value).setHours(23, 59, 59, 999)),
              }))
            }
            className="w-40"
          />
        </div>
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load report"}
        </Card>
      )}

      {isLoading || !data ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : data.rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No data in this range.</Card>
      ) : (
        <Card className="overflow-hidden">
          {type === "revenue" && (
            <RevenueTable rows={data.rows as unknown as RevenueRow[]} totals={data.totals} />
          )}
          {type === "outstanding" && (
            <OutstandingTable rows={data.rows as unknown as OutstandingRow[]} totals={data.totals} />
          )}
          {type === "gst" && <GstTable rows={data.rows as unknown as GstRow[]} totals={data.totals} />}
          {type === "client-performance" && (
            <ClientPerformanceTable
              rows={data.rows as unknown as ClientPerformanceRow[]}
              totals={data.totals}
            />
          )}
        </Card>
      )}
    </section>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("px-4 py-3 font-medium", right && "text-right")}>{children}</th>
  );
}

function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td className={cn("px-4 py-3", right && "text-right", mono && "font-mono")}>{children}</td>
  );
}

function TotalsFoot({ cells }: { cells: Array<{ label?: string; value: string; right?: boolean }> }) {
  return (
    <tfoot className="border-t bg-muted/40 text-sm font-semibold">
      <tr>
        {cells.map((c, i) => (
          <td key={i} className={cn("px-4 py-3", c.right && "text-right")}>
            {c.label ?? c.value}
          </td>
        ))}
      </tr>
    </tfoot>
  );
}

function RevenueTable({ rows, totals }: { rows: RevenueRow[]; totals?: Record<string, number> }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
        <tr>
          <Th>Month</Th>
          <Th right>Invoices</Th>
          <Th right>Billed</Th>
          <Th right>Collected</Th>
          <Th right>Outstanding</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.month} className="border-b last:border-b-0">
            <Td>{r.month}</Td>
            <Td right>{r.invoiceCount}</Td>
            <Td right mono>
              {formatINR(r.billed)}
            </Td>
            <Td right mono>
              {formatINR(r.collected)}
            </Td>
            <Td right mono>
              {formatINR(r.outstanding)}
            </Td>
          </tr>
        ))}
      </tbody>
      {totals && (
        <TotalsFoot
          cells={[
            { label: "Total", value: "" },
            { value: "", right: true },
            { value: formatINR(totals.billed ?? 0), right: true },
            { value: formatINR(totals.collected ?? 0), right: true },
            { value: formatINR(totals.outstanding ?? 0), right: true },
          ]}
        />
      )}
    </table>
  );
}

function OutstandingTable({ rows, totals }: { rows: OutstandingRow[]; totals?: Record<string, number> }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
        <tr>
          <Th>Invoice</Th>
          <Th>Client</Th>
          <Th>Issued</Th>
          <Th>Due</Th>
          <Th right>Total</Th>
          <Th>Status</Th>
          <Th right>Overdue (d)</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.invoiceNumber} className="border-b last:border-b-0">
            <Td>{r.invoiceNumber}</Td>
            <Td>{r.clientName}</Td>
            <Td>{formatDate(r.issuedAt)}</Td>
            <Td>{formatDate(r.dueDate)}</Td>
            <Td right mono>
              {formatINR(r.total)}
            </Td>
            <Td>
              <span className="capitalize">{r.status}</span>
            </Td>
            <Td right>{r.daysOverdue > 0 ? r.daysOverdue : "—"}</Td>
          </tr>
        ))}
      </tbody>
      {totals && (
        <TotalsFoot
          cells={[
            { label: "Total", value: "" },
            { value: "" },
            { value: "" },
            { value: "" },
            { value: formatINR(totals.total ?? 0), right: true },
            { value: "" },
            { value: "" },
          ]}
        />
      )}
    </table>
  );
}

function GstTable({ rows, totals }: { rows: GstRow[]; totals?: Record<string, number> }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
        <tr>
          <Th>Month</Th>
          <Th right>Subtotal</Th>
          <Th right>CGST</Th>
          <Th right>SGST</Th>
          <Th right>IGST</Th>
          <Th right>Tax total</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.month} className="border-b last:border-b-0">
            <Td>{r.month}</Td>
            <Td right mono>
              {formatINR(r.subtotal)}
            </Td>
            <Td right mono>
              {formatINR(r.cgst)}
            </Td>
            <Td right mono>
              {formatINR(r.sgst)}
            </Td>
            <Td right mono>
              {formatINR(r.igst)}
            </Td>
            <Td right mono>
              {formatINR(r.taxTotal)}
            </Td>
          </tr>
        ))}
      </tbody>
      {totals && (
        <TotalsFoot
          cells={[
            { label: "Total", value: "" },
            { value: formatINR(totals.subtotal ?? 0), right: true },
            { value: formatINR(totals.cgst ?? 0), right: true },
            { value: formatINR(totals.sgst ?? 0), right: true },
            { value: formatINR(totals.igst ?? 0), right: true },
            { value: formatINR(totals.taxTotal ?? 0), right: true },
          ]}
        />
      )}
    </table>
  );
}

function ClientPerformanceTable({
  rows,
  totals,
}: {
  rows: ClientPerformanceRow[];
  totals?: Record<string, number>;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
        <tr>
          <Th>Client</Th>
          <Th right>Invoices</Th>
          <Th right>Billed</Th>
          <Th right>Collected</Th>
          <Th right>Outstanding</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.clientName} className="border-b last:border-b-0">
            <Td>{r.clientName}</Td>
            <Td right>{r.invoices}</Td>
            <Td right mono>
              {formatINR(r.billed)}
            </Td>
            <Td right mono>
              {formatINR(r.collected)}
            </Td>
            <Td right mono>
              {formatINR(r.outstanding)}
            </Td>
          </tr>
        ))}
      </tbody>
      {totals && (
        <TotalsFoot
          cells={[
            { label: "Total", value: "" },
            { value: "", right: true },
            { value: formatINR(totals.billed ?? 0), right: true },
            { value: formatINR(totals.collected ?? 0), right: true },
            { value: formatINR(totals.outstanding ?? 0), right: true },
          ]}
        />
      )}
    </table>
  );
}
