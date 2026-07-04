"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrgUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { Organization, Role } from "@/types/settings";

const SETTINGS_KEY = ["settings"] as const;
const ROLES_KEY = ["roles"] as const;

export function useOrg() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => api.get<Organization>("/settings"),
  });
}

export function useUpdateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrgUpdateInput) => api.patch<Organization>("/settings", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => api.get<Role[]>("/settings/roles"),
    staleTime: 5 * 60_000,
  });
}

export function useSendDigestNow() {
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean; emails: number }>("/settings/send-digest-now"),
  });
}
