import type { TaskPriority, TaskStatus } from "@audithub/types";

export interface TaskRow {
  id: string;
  clientId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  recurring: boolean;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  assignee: { id: string; name: string } | null;
}
