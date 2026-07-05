"use client";

import { useEffect, useState } from "react";
import { OrgUpdateSchema, type OrgUpdateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useOrg, useUpdateOrg } from "@/hooks/use-settings";

export function CompanyProfileSection({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading } = useOrg();
  const update = useUpdateOrg();
  const [values, setValues] = useState({ name: "", gstin: "", financialYear: "", plan: "" });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setValues({
        name: data.name ?? "",
        gstin: data.gstin ?? "",
        financialYear: data.financialYear ?? "",
        plan: data.plan ?? "",
      });
    }
  }, [data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const parsed = OrgUpdateSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    try {
      await update.mutateAsync(parsed.data as OrgUpdateInput);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Save failed");
    }
  }

  if (isLoading) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Firm name</Label>
              <Input
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label>GSTIN</Label>
              <Input
                value={values.gstin}
                onChange={(e) => setValues((v) => ({ ...v, gstin: e.target.value.toUpperCase() }))}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label>Financial year</Label>
              <Input
                value={values.financialYear}
                onChange={(e) => setValues((v) => ({ ...v, financialYear: e.target.value }))}
                placeholder="2025-26"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label>Plan</Label>
              <Input
                value={values.plan}
                onChange={(e) => setValues((v) => ({ ...v, plan: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">Saved.</p>}

          {canEdit && (
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto">
                {update.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
