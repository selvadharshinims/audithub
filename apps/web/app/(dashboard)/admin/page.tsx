"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, ShieldAlert, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Field, MobileList, TableScroll } from "@/components/ui/responsive-table";
import {
  type AdminUser,
  type AdminUserStatus,
  useAdminDeleteUser,
  useAdminOverview,
  useAdminResetPassword,
  useAdminUserAction,
  useAdminUsers,
} from "@/hooks/use-admin";
import { useMe } from "@/hooks/use-me";
import { formatDate } from "@/lib/format";

const STATUS_META: Record<
  AdminUserStatus,
  { label: string; variant: "default" | "success" | "warning" | "muted" | "destructive" }
> = {
  platform: { label: "Platform admin", variant: "default" },
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending approval", variant: "warning" },
  suspended: { label: "Suspended", variant: "muted" },
};

const ORDER: Record<AdminUserStatus, number> = { pending: 0, active: 1, suspended: 2, platform: 3 };

function StatusBadge({ status }: { status: AdminUserStatus }) {
  const cfg = STATUS_META[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function AdminPage() {
  const me = useMe();
  const overview = useAdminOverview();
  const users = useAdminUsers();
  const action = useAdminUserAction();
  const del = useAdminDeleteUser();
  const resetPw = useAdminResetPassword();

  const [actingId, setActingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...(users.data ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status]),
    [users.data],
  );

  // Cosmetic guard only — the real check is server-side requirePlatformAdmin.
  if (me.isSuccess && !me.data.isPlatformAdmin) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <h1 className="mt-3 text-lg font-semibold">Not authorized</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This control panel is restricted to the platform administrator.
        </p>
      </Card>
    );
  }

  async function runAction(id: string, act: "approve" | "activate" | "deactivate") {
    setActingId(id);
    try {
      await action.mutateAsync({ id, action: act });
    } finally {
      setActingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setActingId(deleteTarget.id);
    try {
      await del.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setActingId(null);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }
    if (!resetTarget) return;
    try {
      await resetPw.mutateAsync({ id: resetTarget.id, password: newPassword });
      setResetDone(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  function closeReset() {
    setResetTarget(null);
    setNewPassword("");
    setResetError(null);
    setResetDone(false);
  }

  const tiles = [
    { label: "Total users", value: overview.data?.totalUsers, icon: ShieldCheck, tone: "default" as const },
    { label: "Pending", value: overview.data?.pendingUsers, icon: UserCheck, tone: "warning" as const },
    { label: "Active", value: overview.data?.activeUsers, icon: CheckCircle2, tone: "success" as const },
    { label: "Workspaces", value: overview.data?.totalWorkspaces, icon: ShieldCheck, tone: "default" as const },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold sm:text-2xl">Admin control</h1>
        <p className="text-sm text-muted-foreground">
          Approve signups, manage access, and oversee every workspace.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => {
          const tone = {
            default: "bg-primary/10 text-primary",
            warning: "bg-warning/15 text-warning",
            success: "bg-success/15 text-success",
          }[t.tone];
          return (
            <div key={t.label} className="rounded-xl border bg-card p-4 shadow-premium-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t.label}
                </span>
                <span className={`rounded-lg p-1.5 ${tone}`}>
                  <t.icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">{t.value ?? "—"}</div>
            </div>
          );
        })}
      </div>

      {users.isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading users…</Card>
      ) : users.isError ? (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load users:{" "}
          {users.error instanceof Error ? users.error.message : "Unknown error"}
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No users yet.</Card>
      ) : (
        <>
          <TableScroll>
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Workspace</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">{u.workspace.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <RowActions
                          user={u}
                          busy={actingId === u.id}
                          onApprove={() => runAction(u.id, "approve")}
                          onActivate={() => runAction(u.id, "activate")}
                          onDeactivate={() => runAction(u.id, "deactivate")}
                          onReset={() => setResetTarget(u)}
                          onDelete={() => {
                            setDeleteError(null);
                            setDeleteTarget(u);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          <MobileList>
            {sorted.map((u) => (
              <Card key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{u.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
                <div className="mt-3 space-y-1 border-t pt-3">
                  <Field label="Workspace">{u.workspace.name}</Field>
                  <Field label="Last login">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</Field>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <RowActions
                    user={u}
                    busy={actingId === u.id}
                    onApprove={() => runAction(u.id, "approve")}
                    onActivate={() => runAction(u.id, "activate")}
                    onDeactivate={() => runAction(u.id, "deactivate")}
                    onReset={() => setResetTarget(u)}
                    onDelete={() => {
                      setDeleteError(null);
                      setDeleteTarget(u);
                    }}
                  />
                </div>
              </Card>
            ))}
          </MobileList>
        </>
      )}

      <Modal
        open={Boolean(resetTarget)}
        onClose={closeReset}
        title="Reset password"
        description={resetTarget ? `Set a new password for ${resetTarget.email}.` : undefined}
      >
        {resetDone ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Password updated. Share the new password with{" "}
              <span className="font-medium text-foreground">{resetTarget?.name}</span> securely.
            </p>
            <div className="flex justify-end">
              <Button onClick={closeReset}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitReset} className="space-y-4">
            <div className="space-y-1">
              <Label>New password</Label>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
            </div>
            {resetError && <p className="text-sm text-red-600">{resetError}</p>}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeReset} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={resetPw.isPending} className="w-full sm:w-auto">
                {resetPw.isPending ? "Saving…" : "Set password"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permanently delete <span className="font-medium text-foreground">{deleteTarget.name}</span>{" "}
              <span className="text-muted-foreground">({deleteTarget.email})</span>? If they are the last member
              of <span className="font-medium text-foreground">{deleteTarget.workspace.name}</span>, the entire
              workspace and all of its data will be removed. This cannot be undone.
            </p>
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={del.isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
                disabled={del.isPending}
                className="w-full sm:w-auto"
              >
                {del.isPending ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

function RowActions({
  user,
  busy,
  onApprove,
  onActivate,
  onDeactivate,
  onReset,
  onDelete,
}: {
  user: AdminUser;
  busy: boolean;
  onApprove: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  if (user.status === "platform") {
    return <span className="text-xs text-muted-foreground">Protected</span>;
  }
  return (
    <>
      {user.status === "pending" && (
        <Button size="sm" onClick={onApprove} disabled={busy}>
          <UserCheck className="h-4 w-4" />
          Approve
        </Button>
      )}
      {user.status === "suspended" && (
        <Button size="sm" variant="outline" onClick={onActivate} disabled={busy}>
          <UserCheck className="h-4 w-4" />
          Activate
        </Button>
      )}
      {user.status === "active" && (
        <Button size="sm" variant="outline" onClick={onDeactivate} disabled={busy}>
          <UserX className="h-4 w-4" />
          Deactivate
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onReset} disabled={busy} title="Reset password">
        <KeyRound className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Reset</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        disabled={busy}
        title="Delete user / workspace"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Delete</span>
      </Button>
    </>
  );
}
