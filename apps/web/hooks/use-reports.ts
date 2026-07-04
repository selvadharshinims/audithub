"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ReportPayload, ReportType } from "@/types/report";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function useReport(type: ReportType, range: { from: string; to: string }) {
  return useQuery({
    queryKey: ["reports", type, range.from, range.to],
    queryFn: () =>
      api.get<ReportPayload>(
        `/reports/${type}?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      ),
  });
}

export async function downloadReport(
  type: ReportType,
  format: "xlsx" | "pdf",
  range: { from: string; to: string },
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("audithub.access") : null;
  const url = `${BASE}/reports/${type}/export?format=${format}&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `audithub-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
