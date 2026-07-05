"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDisable2fa, useEnable2fa, useMe, useSetup2fa } from "@/hooks/use-me";

type Stage =
  | { kind: "idle" }
  | { kind: "setup"; qr: string; secret: string }
  | { kind: "backup"; codes: string[] }
  | { kind: "disable" };

export function TwoFactorSection() {
  const { data: me } = useMe();
  const setup = useSetup2fa();
  const enable = useEnable2fa();
  const disable = useDisable2fa();

  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const enabled = me?.twoFactorEnabled;

  async function beginSetup() {
    setError(null);
    try {
      const res = await setup.mutateAsync();
      setStage({ kind: "setup", qr: res.qr, secret: res.secret });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start setup");
    }
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await enable.mutateAsync(code);
      setCode("");
      setStage({ kind: "backup", codes: res.backupCodes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't enable two-factor auth");
    }
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await disable.mutateAsync(password);
      setPassword("");
      setStage({ kind: "idle" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't disable two-factor auth");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          {enabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> On
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <ShieldOff className="h-3.5 w-3.5" /> Off
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Add a second step at sign-in using an authenticator app (Google Authenticator, Authy, 1Password).
          Strongly recommended — your account holds clients&rsquo; tax data.
        </p>

        {error && <p className="text-red-600">{error}</p>}

        {/* Enabled → offer disable */}
        {enabled && stage.kind !== "disable" && (
          <Button variant="outline" onClick={() => { setStage({ kind: "disable" }); setError(null); }}>
            Turn off two-factor auth
          </Button>
        )}

        {enabled && stage.kind === "disable" && (
          <form onSubmit={confirmDisable} className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1">
              <Label>Confirm your password to turn it off</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => { setStage({ kind: "idle" }); setPassword(""); }}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={disable.isPending}>
                {disable.isPending ? "Turning off…" : "Turn off"}
              </Button>
            </div>
          </form>
        )}

        {/* Disabled → offer enable */}
        {!enabled && stage.kind === "idle" && (
          <Button onClick={beginSetup} disabled={setup.isPending}>
            <ShieldCheck className="h-4 w-4" />
            {setup.isPending ? "Starting…" : "Enable two-factor auth"}
          </Button>
        )}

        {!enabled && stage.kind === "setup" && (
          <form onSubmit={confirmEnable} className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stage.qr} alt="Two-factor QR code" width={160} height={160} className="rounded-lg border bg-white p-2" />
              <div className="space-y-2">
                <p className="text-sm">1. Scan this QR code with your authenticator app.</p>
                <p className="text-xs text-muted-foreground">
                  Can&rsquo;t scan? Enter this key manually:
                </p>
                <code className="block break-all rounded bg-background px-2 py-1 font-mono text-xs">{stage.secret}</code>
              </div>
            </div>
            <div className="space-y-1">
              <Label>2. Enter the 6-digit code to confirm</Label>
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="max-w-[180px] text-center tracking-[0.3em]"
                autoFocus
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => { setStage({ kind: "idle" }); setCode(""); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={enable.isPending}>
                {enable.isPending ? "Verifying…" : "Verify & enable"}
              </Button>
            </div>
          </form>
        )}

        {stage.kind === "backup" && (
          <div className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Two-factor authentication is on
            </div>
            <p className="text-sm text-muted-foreground">
              Save these backup codes somewhere safe. Each works once if you lose access to your authenticator.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {stage.codes.map((c) => (
                <code key={c} className="rounded bg-background px-2 py-1 text-center font-mono text-xs">{c}</code>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard?.writeText(stage.codes.join("\n"))}
            >
              Copy codes
            </Button>
            <div>
              <Button onClick={() => setStage({ kind: "idle" })}>Done</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
