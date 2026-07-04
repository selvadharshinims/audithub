"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExpenseCreateInput, ExpenseUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { ExpenseRow, ExpensesResponse } from "@/types/expense";

const KEY = ["expenses"] as const;

export interface ExpenseFilter {
  from?: string;
  to?: string;
  category?: string;
}

export function useExpenses(filter: ExpenseFilter = {}) {
  const qs = new URLSearchParams();
  if (filter.from) qs.set("from", filter.from);
  if (filter.to) qs.set("to", filter.to);
  if (filter.category) qs.set("category", filter.category);
  const query = qs.toString();

  return useQuery({
    queryKey: [...KEY, filter],
    queryFn: () => api.get<ExpensesResponse>(`/expenses${query ? `?${query}` : ""}`),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseCreateInput) => api.post<ExpenseRow>("/expenses", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseUpdateInput }) =>
      api.patch<ExpenseRow>(`/expenses/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
