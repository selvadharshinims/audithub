"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
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
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/payments", label: "Payments", icon: Wallet },
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

export function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {SECTIONS.map((section) => (
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
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
