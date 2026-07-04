"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ActivityLogsResponse } from "@/types/activity-log";

export interface ActivityFilter {
  entity?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useActivityLogs(filter: ActivityFilter) {
  const qs = new URLSearchParams();
  if (filter.entity) qs.set("entity", filter.entity);
  if (filter.actorId) qs.set("actorId", filter.actorId);
  if (filter.from) qs.set("from", filter.from);
  if (filter.to) qs.set("to", filter.to);
  if (filter.limit) qs.set("limit", String(filter.limit));

  const query = qs.toString();

  return useQuery({
    queryKey: ["activity-logs", filter],
    queryFn: () =>
      api.get<ActivityLogsResponse>(`/settings/activity-logs${query ? `?${query}` : ""}`),
  });
}
