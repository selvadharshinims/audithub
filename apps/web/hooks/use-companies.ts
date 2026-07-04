"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanyCreateInput, CompanyUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { CompanyRow } from "@/types/company";

const KEY = (clientId: string) => ["clients", clientId, "companies"] as const;

export function useClientCompanies(clientId: string | undefined) {
  return useQuery({
    queryKey: clientId ? KEY(clientId) : ["clients", "companies"],
    queryFn: () => api.get<CompanyRow[]>(`/clients/${clientId}/companies`),
    enabled: Boolean(clientId),
  });
}

export function useCreateCompany(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyCreateInput) =>
      api.post<CompanyRow>(`/clients/${clientId}/companies`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
      qc.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}

export function useUpdateCompany(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompanyUpdateInput }) =>
      api.patch<CompanyRow>(`/companies/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
      qc.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}

export function useDeleteCompany(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
      qc.invalidateQueries({ queryKey: ["clients", clientId] });
    },
  });
}
