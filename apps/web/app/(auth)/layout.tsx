import Link from "next/link";
import { AuthHero } from "@/components/auth-hero";
import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-hero lg:grid-cols-2">
      <AuthHero />

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
