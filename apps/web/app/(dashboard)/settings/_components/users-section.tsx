"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/format";
import { useCreateUser, useUpdateUser, useUsers } from "@/hooks/use-users";
import type { UserRow } from "@/types/user";
import { CreateUserForm, EditUserForm } from "./user-form";

export function UsersSection({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useUsers();
  const create = useCreateUser();
  const update = useUpdateUser();

  const [mode, setMode] = useState<
    { kind: "closed" } | { kind: "create" } | { kind: "edit"; user: UserRow }
  >({ kind: "closed" });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>
        {canManage && (
          <Button size="sm" onClick={() => setMode({ kind: "create" })}>
            <Plus className="h-3.5 w-3.5" />
            Invite user
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading users…</p>
        ) : !data?.length ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canManage && <th className="w-16 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize">{u.role?.name ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Deactivated</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMode({ kind: "edit", user: u })}
                      >
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Modal
        open={mode.kind === "create"}
        onClose={() => setMode({ kind: "closed" })}
        title="Invite user"
      >
        {mode.kind === "create" && (
          <CreateUserForm
            busy={create.isPending}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              await create.mutateAsync(input);
              setMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>

      <Modal
        open={mode.kind === "edit"}
        onClose={() => setMode({ kind: "closed" })}
        title="Edit user"
        description={mode.kind === "edit" ? mode.user.email : undefined}
      >
        {mode.kind === "edit" && (
          <EditUserForm
            busy={update.isPending}
            initial={{
              name: mode.user.name,
              roleId: mode.user.roleId,
              isActive: mode.user.isActive,
            }}
            onCancel={() => setMode({ kind: "closed" })}
            onSubmit={async (input) => {
              await update.mutateAsync({ id: mode.user.id, input });
              setMode({ kind: "closed" });
            }}
          />
        )}
      </Modal>
    </Card>
  );
}
