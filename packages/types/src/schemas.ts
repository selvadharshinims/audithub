import { z } from "zod";
import {
  CLIENT_STATUS,
  INVOICE_KIND,
  PAYMENT_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  COMPLIANCE_TYPE,
  REMINDER_CHANNEL,
  DOCUMENT_TYPE,
} from "./enums.js";

// Login only asserts shape; account policy (8+ chars) applies to account
// creation and password changes, not to login attempts — enforcing it here
// leaks the policy and returns confusing 400s instead of 401s.
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const RegisterSchema = z.object({
  orgName: z.string().trim().min(2, "Firm name must be at least 2 characters").max(80),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.input<typeof RegisterSchema>;

const optionalTrimmed = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().email().optional(),
);

export const ClientCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  pan: optionalTrimmed,
  gstin: optionalTrimmed,
  aadhaar: optionalTrimmed,
  mobile: optionalTrimmed,
  email: optionalEmail,
  address: optionalTrimmed,
  notes: optionalTrimmed,
  status: z.enum(CLIENT_STATUS).default("active"),
  assignedStaffId: z.string().uuid().optional(),
});
export type ClientCreateInput = z.infer<typeof ClientCreateSchema>;

export const ClientUpdateSchema = ClientCreateSchema.partial();
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;

export const InvoiceCreateSchema = z
  .object({
    clientId: z.string().uuid(),
    number: z.string().trim().min(1, "Invoice number is required"),
    kind: z.enum(INVOICE_KIND).default("invoice"),
    description: optionalTrimmed,
    subtotal: z.coerce.number().nonnegative(),
    cgst: z.coerce.number().nonnegative().optional(),
    sgst: z.coerce.number().nonnegative().optional(),
    igst: z.coerce.number().nonnegative().optional(),
    tax: z.coerce.number().nonnegative().optional(),
    total: z.coerce.number().nonnegative().optional(),
    status: z.enum(PAYMENT_STATUS).default("pending"),
    issuedAt: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    notes: optionalTrimmed,
  })
  .transform((v) => {
    const tax = v.tax ?? (v.cgst ?? 0) + (v.sgst ?? 0) + (v.igst ?? 0);
    const total = v.total ?? v.subtotal + tax;
    return { ...v, tax, total };
  });
export type InvoiceCreateInput = z.input<typeof InvoiceCreateSchema>;
export type InvoiceCreateOutput = z.output<typeof InvoiceCreateSchema>;

export const InvoiceUpdateSchema = z.object({
  number: z.string().trim().min(1).optional(),
  kind: z.enum(INVOICE_KIND).optional(),
  description: optionalTrimmed,
  subtotal: z.coerce.number().nonnegative().optional(),
  cgst: z.coerce.number().nonnegative().optional(),
  sgst: z.coerce.number().nonnegative().optional(),
  igst: z.coerce.number().nonnegative().optional(),
  tax: z.coerce.number().nonnegative().optional(),
  total: z.coerce.number().nonnegative().optional(),
  status: z.enum(PAYMENT_STATUS).optional(),
  issuedAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: optionalTrimmed,
});
export type InvoiceUpdateInput = z.infer<typeof InvoiceUpdateSchema>;

const nullableUuid = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().uuid().optional(),
);

export const TaskCreateSchema = z.object({
  clientId: nullableUuid,
  assigneeId: nullableUuid,
  title: z.string().trim().min(1, "Title is required"),
  description: optionalTrimmed,
  priority: z.enum(TASK_PRIORITY).default("med"),
  status: z.enum(TASK_STATUS).default("todo"),
  dueDate: z.coerce.date().optional(),
  recurring: z.boolean().default(false),
});
export type TaskCreateInput = z.input<typeof TaskCreateSchema>;

export const TaskUpdateSchema = z.object({
  clientId: nullableUuid,
  assigneeId: nullableUuid,
  title: z.string().trim().min(1).optional(),
  description: optionalTrimmed,
  priority: z.enum(TASK_PRIORITY).optional(),
  status: z.enum(TASK_STATUS).optional(),
  dueDate: z.coerce.date().optional(),
  recurring: z.boolean().optional(),
});
export type TaskUpdateInput = z.input<typeof TaskUpdateSchema>;

export const ReminderCreateSchema = z.object({
  clientId: z.string().uuid(),
  title: optionalTrimmed,
  type: z.enum(COMPLIANCE_TYPE),
  dueDate: z.coerce.date(),
  offsets: z.array(z.coerce.number().int().positive()).default([30, 15, 7, 3, 1]),
  channel: z.enum(REMINDER_CHANNEL).default("email"),
  active: z.boolean().default(true),
  notes: optionalTrimmed,
});
export type ReminderCreateInput = z.input<typeof ReminderCreateSchema>;

export const ReminderUpdateSchema = z.object({
  clientId: z.string().uuid().optional(),
  title: optionalTrimmed,
  type: z.enum(COMPLIANCE_TYPE).optional(),
  dueDate: z.coerce.date().optional(),
  offsets: z.array(z.coerce.number().int().positive()).optional(),
  channel: z.enum(REMINDER_CHANNEL).optional(),
  active: z.boolean().optional(),
  notes: optionalTrimmed,
});
export type ReminderUpdateInput = z.input<typeof ReminderUpdateSchema>;

export const PAYMENT_METHOD = ["cash", "bank", "upi", "cheque", "card", "other"] as const;

export const PaymentCreateSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.enum(PAYMENT_METHOD).default("bank"),
  status: z.enum(PAYMENT_STATUS).default("paid"),
  paidAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  reference: optionalTrimmed,
});
export type PaymentCreateInput = z.input<typeof PaymentCreateSchema>;

export const PaymentUpdateSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  method: z.enum(PAYMENT_METHOD).optional(),
  status: z.enum(PAYMENT_STATUS).optional(),
  paidAt: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  reference: optionalTrimmed,
});
export type PaymentUpdateInput = z.input<typeof PaymentUpdateSchema>;

export const UserCreateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
});
export type UserCreateInput = z.input<typeof UserCreateSchema>;

export const UserUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});
export type UserUpdateInput = z.input<typeof UserUpdateSchema>;

export const OrgUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  gstin: optionalTrimmed,
  financialYear: optionalTrimmed,
  plan: optionalTrimmed,
});
export type OrgUpdateInput = z.input<typeof OrgUpdateSchema>;

export const DocumentCreateSchema = z.object({
  type: z.enum(DOCUMENT_TYPE).default("OTHER"),
  name: optionalTrimmed,
});
export type DocumentCreateInput = z.input<typeof DocumentCreateSchema>;

export const DocumentUpdateSchema = z.object({
  type: z.enum(DOCUMENT_TYPE).optional(),
  name: z.string().trim().min(1).optional(),
});
export type DocumentUpdateInput = z.input<typeof DocumentUpdateSchema>;

export const ExpenseCreateSchema = z.object({
  category: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  notes: optionalTrimmed,
});
export type ExpenseCreateInput = z.input<typeof ExpenseCreateSchema>;

export const ExpenseUpdateSchema = z.object({
  category: z.string().trim().min(1).optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  notes: optionalTrimmed,
});
export type ExpenseUpdateInput = z.input<typeof ExpenseUpdateSchema>;

export const ServiceCreateSchema = z.object({
  name: z.string().trim().min(1),
  defaultFee: z.coerce.number().nonnegative().default(0),
  sacCode: optionalTrimmed,
});
export type ServiceCreateInput = z.input<typeof ServiceCreateSchema>;

export const ServiceUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  defaultFee: z.coerce.number().nonnegative().optional(),
  sacCode: optionalTrimmed,
});
export type ServiceUpdateInput = z.input<typeof ServiceUpdateSchema>;

export const CompanyCreateSchema = z.object({
  legalName: z.string().trim().min(1),
  businessType: optionalTrimmed,
  regNo: optionalTrimmed,
});
export type CompanyCreateInput = z.input<typeof CompanyCreateSchema>;

export const CompanyUpdateSchema = z.object({
  legalName: z.string().trim().min(1).optional(),
  businessType: optionalTrimmed,
  regNo: optionalTrimmed,
});
export type CompanyUpdateInput = z.input<typeof CompanyUpdateSchema>;
