"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ClipboardList,
  FileText,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/use-clients";
import { useInvoices } from "@/hooks/use-invoices";
import { useTasks } from "@/hooks/use-tasks";
import { useReminders } from "@/hooks/use-reminders";

type Item = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  section: "Clients" | "Invoices" | "Tasks" | "Reminders";
  icon: typeof Users;
  weight: number;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clients = useClients();
  const invoices = useInvoices();
  const tasks = useTasks();
  const reminders = useReminders();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const q = query.trim().toLowerCase();

  const items = useMemo<Item[]>(() => {
    if (!open) return [];
    const list: Item[] = [];
    const push = (partial: Omit<Item, "weight"> & { hay: string }) => {
      if (!q) {
        list.push({ ...partial, weight: 0 });
        return;
      }
      const hay = partial.hay.toLowerCase();
      if (!hay.includes(q)) return;
      const titleHit = partial.title.toLowerCase().includes(q) ? 10 : 0;
      const startsWith = partial.title.toLowerCase().startsWith(q) ? 5 : 0;
      list.push({ ...partial, weight: titleHit + startsWith + 1 });
    };

    for (const c of clients.data ?? []) {
      push({
        id: `c-${c.id}`,
        href: `/clients/${c.id}`,
        title: c.name,
        subtitle: [c.pan, c.gstin, c.email, c.mobile].filter(Boolean).join(" · ") || "Client",
        section: "Clients",
        icon: Users,
        hay: [c.name, c.pan, c.gstin, c.email, c.mobile].filter(Boolean).join(" "),
      });
    }
    for (const i of invoices.data ?? []) {
      push({
        id: `i-${i.id}`,
        href: `/invoices/${i.id}`,
        title: i.number,
        subtitle: `${i.client.name} · ${i.status}`,
        section: "Invoices",
        icon: FileText,
        hay: [i.number, i.client.name, i.description ?? ""].join(" "),
      });
    }
    for (const t of tasks.data ?? []) {
      push({
        id: `t-${t.id}`,
        href: "/tasks",
        title: t.title,
        subtitle: [t.client?.name, t.assignee?.name, t.status].filter(Boolean).join(" · "),
        section: "Tasks",
        icon: ClipboardList,
        hay: [t.title, t.description ?? "", t.client?.name ?? "", t.assignee?.name ?? ""].join(" "),
      });
    }
    for (const r of reminders.data ?? []) {
      push({
        id: `r-${r.id}`,
        href: `/clients/${r.client.id}`,
        title: r.title ?? `${r.type} for ${r.client.name}`,
        subtitle: `${r.type} · ${new Date(r.dueDate).toLocaleDateString("en-IN")}`,
        section: "Reminders",
        icon: CalendarClock,
        hay: [r.title ?? "", r.client.name, r.type].join(" "),
      });
    }

    list.sort((a, b) => b.weight - a.weight);
    return list.slice(0, 40);
  }, [open, q, clients.data, invoices.data, tasks.data, reminders.data]);

  const grouped = useMemo(() => {
    const groups = new Map<Item["section"], Item[]>();
    for (const it of items) {
      const arr = groups.get(it.section) ?? [];
      arr.push(it);
      groups.set(it.section, arr);
    }
    return [...groups.entries()];
  }, [items]);

  useEffect(() => {
    if (cursor >= items.length) setCursor(Math.max(0, items.length - 1));
  }, [items.length, cursor]);

  function activate(item: Item) {
    onClose();
    router.push(item.href);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(items.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[cursor];
      if (item) activate(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search clients, invoices, tasks, reminders…"
            className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {q ? "No matches." : "Start typing to search across your practice."}
            </p>
          ) : (
            grouped.map(([section, sectionItems]) => (
              <div key={section} className="border-b last:border-b-0">
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section}
                </div>
                <ul>
                  {sectionItems.map((it) => {
                    const idx = items.indexOf(it);
                    const active = idx === cursor;
                    const Icon = it.icon;
                    return (
                      <li
                        key={it.id}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => activate(it)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                          active && "bg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{it.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{it.subtitle}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono">Enter</kbd> open
            </span>
          </div>
          <span>{items.length} result{items.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
