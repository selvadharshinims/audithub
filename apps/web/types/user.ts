export interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roleId: string;
  role?: { id: string; name: string };
  lastLoginAt?: string | null;
  createdAt: string;
}
