"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ServiceCreateInput, ServiceUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { ServiceRow } from "@/types/service";

const KEY = ["services"] as const;

export function useServices() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<ServiceRow[]>("/services"),
    staleTime: 60_000,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceCreateInput) => api.post<ServiceRow>("/services", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ServiceUpdateInput }) =>
      api.patch<ServiceRow>(`/services/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
