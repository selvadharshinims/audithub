export const CLIENT_STATUS = ["active", "pending", "inactive"] as const;
export type ClientStatus = (typeof CLIENT_STATUS)[number];

export const INVOICE_KIND = ["invoice", "quotation", "estimate", "receipt"] as const;
export type InvoiceKind = (typeof INVOICE_KIND)[number];

export const PAYMENT_STATUS = ["paid", "pending", "partial", "overdue"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const TASK_STATUS = ["todo", "progress", "review", "done"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const TASK_PRIORITY = ["low", "med", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITY)[number];

export const COMPLIANCE_TYPE = ["GST", "ITR", "TDS", "ROC", "LICENSE"] as const;
export type ComplianceType = (typeof COMPLIANCE_TYPE)[number];

export const REMINDER_CHANNEL = ["email", "push", "whatsapp"] as const;
export type ReminderChannel = (typeof REMINDER_CHANNEL)[number];

export const SYSTEM_ROLES = ["super_admin", "auditor", "accountant", "staff"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const DOCUMENT_TYPE = [
  "PAN",
  "AADHAAR",
  "GST_CERT",
  "BANK",
  "CHEQUE",
  "DEED",
  "AUDIT_REPORT",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPE)[number];
