import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const features = [
  { icon: Users, title: "Client master", desc: "PAN, GSTIN, Aadhaar, contact, notes — all in one profile with a document vault." },
  { icon: CalendarClock, title: "Compliance calendar", desc: "Never miss a GST, ITR, TDS, ROC deadline. 30/15/7/3/1 day auto-reminders." },
  { icon: FileText, title: "GST invoices", desc: "Tax Invoice, Quotation, Estimate, Receipt with CGST/SGST/IGST breakup. Email + PDF." },
  { icon: Wallet, title: "Payments & AR", desc: "Record payments, auto-recompute invoice status, overdue rollup with one click." },
  { icon: BarChart3, title: "Practice reports", desc: "Revenue, outstanding, GST summary, client performance — export as PDF or Excel." },
  { icon: ShieldCheck, title: "Audit trail", desc: "Every mutating action logged with actor, entity, timestamp, and diff metadata." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen bg-hero">
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/85"
          >
            Start free
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-premium-sm">
            <Sparkles className="h-3 w-3 text-accent" />
            <span>Built for Indian CA practices</span>
          </div>

          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            The operating system for
            <span className="ml-3 inline-block bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              modern auditors.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Replace spreadsheets, notebooks, and reminder chats. AuditHub is one clean
            system for clients, statutory compliance, invoices, payments, tasks, and reports.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-premium transition-transform hover:-translate-y-0.5"
            >
              Start your practice — free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border bg-card px-5 py-3 text-sm font-medium shadow-premium-sm transition-colors hover:bg-muted"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card. 30 seconds to your first invoice.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-xl border bg-card p-5 shadow-premium-sm transition-shadow hover:shadow-premium"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl border-t px-6 py-6 text-center text-xs text-muted-foreground">
        AuditHub · Practice OS · v1.0
      </footer>
    </main>
  );
}
