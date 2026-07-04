"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReminderCreateInput, ReminderUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { ReminderRow } from "@/types/reminder";

const KEY = ["reminders"] as const;

export function useReminders(range?: { from: Date; to: Date }) {
  const rangeKey = range ? [range.from.toISOString(), range.to.toISOString()] : ["all"];
  return useQuery({
    queryKey: [...KEY, ...rangeKey],
    queryFn: () => {
      const qs = range
        ? `?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`
        : "";
      return api.get<ReminderRow[]>(`/reminders${qs}`);
    },
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReminderCreateInput) => api.post<ReminderRow>("/reminders", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReminderUpdateInput }) =>
      api.patch<ReminderRow>(`/reminders/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSendReminderNow() {
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: boolean }>(`/reminders/${id}/send-now`),
  });
}
