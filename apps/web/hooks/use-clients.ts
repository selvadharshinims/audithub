"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientCreateInput, ClientUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { ClientDetail, ClientRecord } from "@/types/client";

const KEY = ["clients"] as const;

export function useClients() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<ClientRecord[]>("/clients"),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.get<ClientDetail>(`/clients/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientCreateInput) => api.post<ClientRecord>("/clients", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientUpdateInput) => api.patch<ClientRecord>(`/clients/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
