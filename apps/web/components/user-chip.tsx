"use client";

import Link from "next/link";
import { useMe } from "@/hooks/use-me";

export function UserChip() {
  const { data } = useMe();
  const initials = (data?.name ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href="/settings"
      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
      title="Settings"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {initials || "?"}
      </span>
      <span className="hidden md:inline">{data?.name ?? "…"}</span>
    </Link>
  );
}
