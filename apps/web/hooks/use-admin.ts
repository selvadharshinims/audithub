"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AdminUserStatus = "platform" | "active" | "suspended" | "pending";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  workspace: { id: string; name: string };
  isPlatformAdmin: boolean;
  status: AdminUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  totalWorkspaces: number;
}

const KEY = ["admin", "users"] as const;
const OVERVIEW_KEY = ["admin", "overview"] as const;

export function useAdminOverview() {
  return useQuery({ queryKey: OVERVIEW_KEY, queryFn: () => api.get<AdminOverview>("/admin/overview") });
}

export function useAdminUsers() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<AdminUser[]>("/admin/users") });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
  };
}

export function useAdminUserAction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "activate" | "deactivate" }) =>
      api.patch<{ id: string; status: AdminUserStatus }>(`/admin/users/${id}`, { action }),
    onSuccess: invalidate,
  });
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post<{ ok: boolean }>(`/admin/users/${id}/reset-password`, { password }),
  });
}

export function useAdminDeleteUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: invalidate,
  });
}
