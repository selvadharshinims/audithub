"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserCreateInput, UserUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { UserRow } from "@/types/user";

const KEY = ["users"] as const;

export function useUsers() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<UserRow[]>("/users"),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => api.post<UserRow>("/users", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserUpdateInput }) =>
      api.patch<UserRow>(`/users/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
