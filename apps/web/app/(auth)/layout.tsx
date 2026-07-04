import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-hero lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r bg-gradient-to-br from-primary via-primary to-accent p-10 text-primary-foreground lg:flex">
        <BrandMark className="text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/60" />

        <div>
          <blockquote className="max-w-md text-2xl font-medium leading-snug">
            &ldquo;Every GST filing, every ITR, every audit — one calendar, one inbox, one
            practice. That&rsquo;s what my firm has been missing.&rdquo;
          </blockquote>
          <div className="mt-6 text-sm text-primary-foreground/70">
            — CA Rohan Mehta, partner at a Mumbai firm
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-2xl font-semibold">30/15/7/3/1</div>
            <div className="text-primary-foreground/70">day reminders</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">CGST · SGST · IGST</div>
            <div className="text-primary-foreground/70">invoice breakup</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">4 exports</div>
            <div className="text-primary-foreground/70">PDF · XLSX</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between px-6 lg:hidden">
          <BrandMark />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>

        <footer className="p-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hidden hover:text-foreground lg:inline">
            ← Back to home
          </Link>
        </footer>
      </div>
    </div>
  );
}
