"use client";

import { useState } from "react";
import type { UserCreateInput, UserUpdateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { useRoles } from "@/hooks/use-settings";

type CreateState = { name: string; email: string; password: string; roleId: string };
type EditState = { name: string; roleId: string; isActive: boolean };

export function CreateUserForm({
  onSubmit,
  onCancel,
  busy,
}: {
  onSubmit: (input: UserCreateInput) => Promise<unknown>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const roles = useRoles();
  const [values, setValues] = useState<CreateState>({ name: "", email: "", password: "", roleId: "" });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) return setError("Name is required");
    if (!values.email.trim()) return setError("Email is required");
    if (values.password.length < 8) return setError("Password must be at least 8 characters");
    if (!values.roleId) return setError("Role is required");

    try {
      await onSubmit({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        roleId: values.roleId,
      });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Save failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input
          type="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label>Temporary password</Label>
        <Input
          type="password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          placeholder="Min 8 characters"
        />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select value={values.roleId} onChange={(e) => setValues((v) => ({ ...v, roleId: e.target.value }))}>
          <option value="">{roles.isLoading ? "Loading…" : "Select role"}</option>
          {roles.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}

export function EditUserForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial: { name: string; roleId: string; isActive: boolean };
  onSubmit: (input: UserUpdateInput) => Promise<unknown>;
  onCancel: () => void;
  busy?: boolean;
}) {
  const roles = useRoles();
  const [values, setValues] = useState<EditState>(initial);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ name: values.name.trim(), roleId: values.roleId, isActive: values.isActive });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Save failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select value={values.roleId} onChange={(e) => setValues((v) => ({ ...v, roleId: e.target.value }))}>
          {roles.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
          className="h-4 w-4"
        />
        Active (can sign in)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
