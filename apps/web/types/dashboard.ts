import type { ComplianceType, TaskStatus } from "@audithub/types";

export interface DashboardSummary {
  kpis: {
    totalClients: number;
    openTasks: number;
    overdueInvoices: number;
    completedTasks30d: number;
    outstandingDues: number;
    revenueFY: number;
  };
  revenueByMonth: Array<{ label: string; revenue: number; billed: number }>;
  clientsByMonth: Array<{ label: string; total: number; added: number }>;
  taskStatusCounts: Array<{ status: TaskStatus; count: number }>;
  upcomingReminders: Array<{
    id: string;
    title: string | null;
    type: ComplianceType;
    dueDate: string;
    client: { id: string; name: string };
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    createdAt: string;
    actor: { id: string; name: string } | null;
  }>;
  meta: {
    financialYear: { start: string; end: string };
    generatedAt: string;
  };
}
