"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Practice",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/compliance", label: "Compliance", icon: CalendarClock },
      { href: "/tasks", label: "Tasks", icon: ClipboardList },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/settings/services", label: "Services", icon: Briefcase },
    ],
  },
];

const PLATFORM_SECTION: NavSection = {
  title: "Platform",
  items: [{ href: "/admin", label: "Admin control", icon: ShieldCheck }],
};

export function SidebarNav() {
  const pathname = usePathname();
  const { data: me } = useMe();

  const sections = me?.isPlatformAdmin ? [...SECTIONS, PLATFORM_SECTION] : SECTIONS;

  // A link is "matched" when the current path equals it or sits under it
  // (with a `/` boundary so `/settings` doesn't match `/settings-x`).
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const matches = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Only the most specific matching link lights up — otherwise `/settings/services`
  // would activate both Settings (`/settings`) and Services.
  const activeHref = allHrefs
    .filter(matches)
    .reduce<string | null>((best, href) => (best && best.length >= href.length ? best : href), null);

  const isActive = (href: string) => href === activeHref;

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {section.title}
          </div>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "tap-target group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-primary" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
