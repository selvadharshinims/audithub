"use client";

import Link from "next/link";
import { useOrg } from "@/hooks/use-settings";

/**
 * The firm's own logo, shown at the top-right of the topbar. Renders nothing
 * until an org logo has been uploaded (Settings → Organization). Links to
 * settings so it's discoverable. Distinct from the AuditHub BrandMark (left).
 */
export function OrgLogo() {
  const { data: org } = useOrg();
  if (!org?.logo) return null;

  return (
    <Link
      href="/settings"
      title={org.name}
      className="flex h-9 items-center rounded-md px-1 hover:bg-muted"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={org.logo}
        alt={org.name}
        className="h-7 w-auto max-w-[120px] object-contain"
      />
    </Link>
  );
}
