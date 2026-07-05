"use client";

import Link from "next/link";
import { Briefcase, History, LogOut, Mail } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLogout, useMe } from "@/hooks/use-me";
import { useSendDigestNow } from "@/hooks/use-settings";
import { CompanyProfileSection } from "./_components/company-profile";
import { UsersSection } from "./_components/users-section";
import { ChangePasswordSection } from "./_components/password-section";
import { TwoFactorSection } from "./_components/two-factor-section";

export default function SettingsPage() {
  const { data: me, isLoading } = useMe();
  const logout = useLogout();

  const isSuperAdmin = me?.role.name === "super_admin";

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Organization, team, and account</p>
        </div>
        <Button variant="outline" onClick={logout} className="w-full md:w-auto">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </header>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : (
        me && (
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Signed in as</div>
                <div className="text-sm">
                  <span className="font-medium">{me.name}</span>{" "}
                  <span className="text-muted-foreground">· {me.email}</span>
                </div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Role: </span>
                <span className="font-medium capitalize">{me.role.name.replace(/_/g, " ")}</span>
              </div>
            </CardContent>
          </Card>
        )
      )}

      <CompanyProfileSection canEdit={isSuperAdmin} />
      <UsersSection canManage={isSuperAdmin} />
      <ChangePasswordSection />
      <TwoFactorSection />

      <Link
        href="/settings/services"
        className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm hover:bg-muted"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Briefcase className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="font-medium">Services catalog</div>
            <div className="text-xs text-muted-foreground">
              Reusable services with default fees + SAC codes; used to pre-fill invoices.
            </div>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">Open →</span>
      </Link>

      {isSuperAdmin && (
        <>
          <Link
            href="/settings/audit-log"
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm hover:bg-muted"
          >
            <div className="flex min-w-0 items-center gap-3">
              <History className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium">Audit log</div>
                <div className="text-xs text-muted-foreground">
                  Every mutating action across your practice — actor, entity, timestamp, meta.
                </div>
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">Open →</span>
          </Link>
          <DigestCard />
        </>
      )}

      {!isSuperAdmin && (
        <p className="text-xs text-muted-foreground">
          Some sections are read-only because you don&apos;t have admin permissions. Ask a super admin to make
          changes.
        </p>
      )}
    </section>
  );
}

function DigestCard() {
  const send = useSendDigestNow();
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="font-medium">Daily digest email</div>
          <div className="text-xs text-muted-foreground">
            Auto-sent to every active user each morning at 08:00 — KPIs, deadlines (next 7 days), overdue invoices.
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        disabled={send.isPending}
        onClick={async () => {
          try {
            const res = await send.mutateAsync();
            alert(`Digest sent to ${res.emails} recipient${res.emails === 1 ? "" : "s"} — check the API server logs.`);
          } catch (err) {
            alert(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Send failed");
          }
        }}
      >
        {send.isPending ? "Sending…" : "Send now"}
      </Button>
    </div>
  );
}
