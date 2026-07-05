"use client";

import { useQuery } from "@tanstack/react-query";
import { api, authFetch } from "@/lib/api";
import type { ReportPayload, ReportType } from "@/types/report";

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
  const path = `/reports/${type}/export?format=${format}&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  const res = await authFetch(path, { method: "GET" });
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
