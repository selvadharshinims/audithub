import type { ComplianceType, ReminderChannel } from "@audithub/types";

export interface ReminderRow {
  id: string;
  clientId: string;
  title: string | null;
  type: ComplianceType;
  dueDate: string;
  offsets: number[];
  channel: ReminderChannel | string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string };
}
