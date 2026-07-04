export interface ActivityLogRow {
  id: string;
  orgId: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}

export interface ActivityLogsResponse {
  rows: ActivityLogRow[];
  entities: string[];
}
