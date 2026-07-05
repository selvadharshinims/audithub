export interface Me {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isPlatformAdmin: boolean;
  approvedAt: string | null;
  twoFactorEnabled: boolean;
  role: { id: string; name: string };
  org: { id: string; name: string };
}

export interface Organization {
  id: string;
  name: string;
  gstin: string | null;
  financialYear: string | null;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, unknown>;
}
