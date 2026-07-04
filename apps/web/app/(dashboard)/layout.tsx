import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { NotificationsBell } from "@/components/notifications-bell";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserChip } from "@/components/user-chip";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-muted/30">
      <aside className="sticky top-0 flex h-screen flex-col border-r bg-card">
        <Link href="/dashboard" className="flex h-16 items-center border-b px-5">
          <BrandMark />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t p-3 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>v1.0 · Skeleton build</span>
            <span className="rounded-full bg-success/15 px-2 py-0.5 font-medium text-success">
              Live
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/95 px-6 backdrop-blur">
          <CommandPaletteTrigger />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsBell />
            <div className="mx-1 h-6 w-px bg-border" />
            <UserChip />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] p-6 md:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
