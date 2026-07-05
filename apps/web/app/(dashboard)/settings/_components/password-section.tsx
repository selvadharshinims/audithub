"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useChangePassword } from "@/hooks/use-me";

export function ChangePasswordSection() {
  const change = useChangePassword();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (values.newPassword.length < 8) return setError("New password must be at least 8 characters");
    if (values.newPassword !== values.confirm) return setError("Passwords do not match");
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setOk(true);
      setValues({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Change failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Current password</Label>
              <Input
                type="password"
                value={values.currentPassword}
                onChange={(e) => setValues((v) => ({ ...v, currentPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>New password</Label>
              <Input
                type="password"
                value={values.newPassword}
                onChange={(e) => setValues((v) => ({ ...v, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Confirm new</Label>
              <Input
                type="password"
                value={values.confirm}
                onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {ok && <p className="text-sm text-emerald-600">Password changed.</p>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" disabled={change.isPending} className="w-full sm:w-auto">
              {change.isPending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
