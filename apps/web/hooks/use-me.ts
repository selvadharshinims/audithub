"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Me } from "@/types/settings";

const KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<Me>("/auth/me"),
    staleTime: 60_000,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.post<{ ok: boolean }>("/auth/change-password", input),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("audithub.access");
      localStorage.removeItem("audithub.refresh");
    }
    qc.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
  };
}
