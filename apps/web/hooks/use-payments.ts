"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentCreateInput, PaymentUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { PaymentRow } from "@/types/payment";

const KEY = ["payments"] as const;

export function usePayments() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<PaymentRow[]>("/payments"),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentCreateInput) => api.post<PaymentRow>("/payments", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PaymentUpdateInput }) =>
      api.patch<PaymentRow>(`/payments/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
