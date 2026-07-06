"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { OrgUpdateSchema, type OrgUpdateInput } from "@audithub/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { fileToResizedDataUrl } from "@/lib/image";
import { useOrg, useUpdateOrg } from "@/hooks/use-settings";

export function CompanyProfileSection({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading } = useOrg();
  const update = useUpdateOrg();
  const [values, setValues] = useState({ name: "", gstin: "", financialYear: "", plan: "" });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function handleLogoFile(file: File) {
    setError(null);
    setSaved(false);
    setLogoBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 240);
      await update.mutateAsync({ logo: dataUrl });
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Logo upload failed");
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleLogoRemove() {
    setError(null);
    setSaved(false);
    setLogoBusy(true);
    try {
      await update.mutateAsync({ logo: null });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove logo");
    } finally {
      setLogoBusy(false);
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
          <div className="space-y-1.5">
            <Label>Firm logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                {data?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.logo} alt="Firm logo" className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoFile(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoBusy}
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {logoBusy ? "Uploading…" : data?.logo ? "Replace" : "Upload logo"}
                  </Button>
                  {data?.logo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      disabled={logoBusy}
                      onClick={handleLogoRemove}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                  <p className="w-full text-xs text-muted-foreground">
                    PNG or JPEG. Shown in the header and on invoice PDFs.
                  </p>
                </div>
              )}
            </div>
          </div>

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
