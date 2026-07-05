"use client";

import { useEffect, useState } from "react";
import { onlineManager, useMutationState } from "@tanstack/react-query";
import { Check, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    // Read the real browser state on mount (covers loading while already
    // offline, when no online/offline event ever fires) and keep RQ in sync.
    const current = typeof navigator !== "undefined" ? navigator.onLine : true;
    onlineManager.setOnline(current);
    setOnline(current);
    const on = () => {
      onlineManager.setOnline(true);
      setOnline(true);
    };
    const off = () => {
      onlineManager.setOnline(false);
      setOnline(false);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsub = onlineManager.subscribe(setOnline);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      unsub();
    };
  }, []);
  return online;
}

/**
 * Topbar pill showing connectivity + sync state:
 *  - Offline  → amber "Offline" (+ queued write count)
 *  - Online with queued writes flushing → "Syncing…"
 *  - Otherwise hidden (briefly shows "Synced" right after a flush)
 */
export function OfflineIndicator() {
  const online = useOnline();
  const pending = useMutationState({ filters: { status: "pending" } }).length;
  const [justSynced, setJustSynced] = useState(false);
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    if (pending > 0) setWasPending(true);
    else if (wasPending) {
      setWasPending(false);
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 2500);
      return () => clearTimeout(t);
    }
  }, [pending, wasPending]);

  if (!online) {
    return (
      <Pill tone="warning" icon={<CloudOff className="h-3.5 w-3.5" />}>
        Offline{pending > 0 ? ` · ${pending} queued` : ""}
      </Pill>
    );
  }
  if (pending > 0) {
    return (
      <Pill tone="primary" icon={<RefreshCw className="h-3.5 w-3.5 animate-spin" />}>
        Syncing {pending}…
      </Pill>
    );
  }
  if (justSynced) {
    return (
      <Pill tone="success" icon={<Check className="h-3.5 w-3.5" />}>
        Synced
      </Pill>
    );
  }
  return null;
}

function Pill({
  tone,
  icon,
  children,
}: {
  tone: "warning" | "primary" | "success";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    warning: "bg-warning/15 text-warning",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </span>
  );
}
