"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Eye, EyeOff, KeyRound, Mail, MailCheck, User } from "lucide-react";
import { api } from "@/lib/api";

export default function SignupPage() {
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      // Registration creates a PENDING workspace — no auto-login. The account
      // stays locked until a platform admin approves it.
      await api.post<{ pending: boolean }>("/auth/register", { orgName, name, email, password });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="animate-slide-up space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <MailCheck className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Request received</h1>
          <p className="text-sm text-muted-foreground">
            Thanks, {name || "there"}. Your workspace <span className="font-medium text-foreground">{orgName}</span> has
            been created and is <span className="font-medium text-foreground">awaiting administrator approval</span>.
            You&rsquo;ll be able to sign in with <span className="font-medium text-foreground">{email}</span> once an
            administrator approves your account.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border bg-card text-sm font-medium shadow-premium-sm transition-colors hover:bg-muted"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create your practice</h1>
        <p className="text-sm text-muted-foreground">
          Sign up in 30 seconds — no credit card, no commitment.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="orgName" className="text-sm font-medium">Firm name</label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="orgName"
              autoComplete="organization"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              placeholder="Mehta & Associates"
              className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm shadow-premium-sm outline-none transition-shadow focus:ring-brand"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Your name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="CA Rohan Mehta"
              className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm shadow-premium-sm outline-none transition-shadow focus:ring-brand"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">Work email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@firm.in"
              className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm shadow-premium-sm outline-none transition-shadow focus:ring-brand"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="h-11 w-full rounded-md border bg-background pl-9 pr-10 text-sm shadow-premium-sm outline-none transition-shadow focus:ring-brand"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-premium transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? "Creating your practice…" : "Create practice"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to reasonable use.{" "}
          <Link href="/login" className="text-primary hover:underline">
            Already have an account?
          </Link>
        </p>
      </form>
    </div>
  );
}
