"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvoiceCreateInput, InvoiceUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { InvoiceDetail, InvoiceRow } from "@/types/invoice";

const KEY = ["invoices"] as const;

export function useInvoices() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<InvoiceRow[]>("/invoices"),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.get<InvoiceDetail>(`/invoices/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceCreateInput) => api.post<InvoiceRow>("/invoices", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceUpdateInput) => api.patch<InvoiceRow>(`/invoices/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function useSendInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (to?: string) =>
      api.post<{ ok: boolean; to: string }>(`/invoices/${id}/send`, to ? { to } : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export async function downloadInvoicePdf(invoiceId: string, filename: string): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("audithub.access") : null;
  const res = await fetch(`${BASE}/invoices/${invoiceId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("PDF download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
