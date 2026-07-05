"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, clearSession } from "@/lib/api";
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

export function useSetup2fa() {
  return useMutation({
    mutationFn: () => api.post<{ qr: string; secret: string; otpauthUrl: string }>("/auth/2fa/setup"),
  });
}

export function useEnable2fa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<{ backupCodes: string[] }>("/auth/2fa/enable", { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDisable2fa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.post<{ ok: boolean }>("/auth/2fa/disable", { password }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return () => {
    // Clears tokens AND the persisted query cache (see clearSession) so the next
    // user on this device can't see the previous user's data.
    clearSession();
    qc.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
  };
}
