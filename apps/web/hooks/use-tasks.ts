"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaskCreateInput, TaskUpdateInput } from "@audithub/types";
import { api } from "@/lib/api";
import type { TaskRow } from "@/types/task";

const KEY = ["tasks"] as const;

export function useTasks() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<TaskRow[]>("/tasks"),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => api.post<TaskRow>("/tasks", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskUpdateInput }) =>
      api.patch<TaskRow>(`/tasks/${id}`, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<TaskRow[]>(KEY);
      if (previous) {
        qc.setQueryData<TaskRow[]>(
          KEY,
          previous.map((t) => (t.id === id ? { ...t, ...input } as TaskRow : t)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
