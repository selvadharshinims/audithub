import Image from "next/image";
import { BarChart3, Check, IndianRupee, Search, ShieldCheck } from "lucide-react";

/**
 * Login/auth hero — a 3D "audit desk" scene: a floating audit report being
 * inspected by a magnifying glass, a mini chart, a coin stack and a verified
 * badge, over the AuditHub blue→red brand gradient. Pure CSS 3D + float anims.
 */
export function AuthHero() {
  return (
    <div className="relative hidden overflow-hidden bg-[#070b1a] lg:block">
      {/* brand gradient wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_0%,#1b3fb8_0%,transparent_55%),radial-gradient(120%_90%_at_100%_100%,#b91c2b_0%,transparent_50%),linear-gradient(160deg,#070b1a,#0a1230_60%,#160a12)]" />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff22 1px, transparent 1px), linear-gradient(90deg, #ffffff22 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(70% 70% at 50% 40%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-10 text-white">
        {/* logo */}
        <div className="flex items-center gap-3">
          <Image src="/audithub-logo.png" alt="AuditHub" width={132} height={132} className="h-16 w-16 rounded-xl" priority />
          <div className="leading-none">
            <div className="text-xl font-bold tracking-tight">
              <span className="text-[#5b8bff]">Audit</span>
              <span className="text-[#ff5a63]">Hub</span>
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
              Practice OS
            </div>
          </div>
        </div>

        {/* 3D scene */}
        <div className="relative mx-auto my-6 h-[360px] w-full max-w-md [perspective:1400px]">
          <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(14deg)_rotateY(-16deg)]">
            {/* main audit report card */}
            <div className="absolute left-6 top-8 w-64 animate-float rounded-2xl border border-white/15 bg-white p-5 text-slate-800 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.65)]">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Audit Report
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Check className="h-3 w-3" /> VERIFIED
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-2.5 w-3/4 rounded-full bg-slate-200" />
                <div className="h-2.5 w-full rounded-full bg-slate-100" />
                <div className="h-2.5 w-5/6 rounded-full bg-slate-100" />
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Net total</span>
                <span className="flex items-center text-lg font-bold text-slate-900">
                  <IndianRupee className="h-4 w-4" />
                  4,83,800
                </span>
              </div>
            </div>

            {/* mini bar chart card (deeper) */}
            <div
              className="absolute right-2 top-0 w-40 animate-float-slow rounded-xl border border-white/15 bg-[#0f1836] p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] [transform:translateZ(60px)]"
              style={{ animationDelay: "1.2s" }}
            >
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                <BarChart3 className="h-3.5 w-3.5" /> Revenue
              </div>
              <div className="flex h-16 items-end gap-1.5">
                {[40, 65, 45, 80, 60, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{ height: `${h}%`, background: i % 2 ? "#ff5a63" : "#5b8bff" }}
                  />
                ))}
              </div>
            </div>

            {/* coin stack */}
            <div
              className="absolute bottom-2 left-0 animate-float-sm [transform:translateZ(90px)]"
              style={{ animationDelay: "0.6s" }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="relative -mt-2 flex h-8 w-20 items-center justify-center rounded-full border border-amber-300 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-900 shadow-md first:mt-0"
                >
                  <IndianRupee className="h-4 w-4" />
                </div>
              ))}
            </div>

            {/* magnifying glass inspecting the report */}
            <div
              className="absolute bottom-10 right-10 animate-float [transform:translateZ(130px)]"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80 bg-white/10 backdrop-blur-sm shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
                <Search className="h-8 w-8 text-white" />
              </div>
              <div className="ml-16 h-10 w-3 -rotate-45 rounded-full bg-white/80 shadow-md" />
            </div>

            {/* verified shield badge */}
            <div
              className="absolute -top-2 left-2 flex h-14 w-14 animate-float-slow items-center justify-center rounded-2xl bg-gradient-to-br from-[#2f6bff] to-[#b91c2b] text-white shadow-[0_16px_36px_-8px_rgba(47,107,255,0.6)] [transform:translateZ(150px)]"
              style={{ animationDelay: "0.9s" }}
            >
              <ShieldCheck className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* tagline + stats */}
        <div>
          <h2 className="max-w-sm text-2xl font-semibold leading-snug">
            Every filing, invoice and audit — inspected, reconciled, and in one place.
          </h2>
          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xl font-bold">30/15/7/3/1</div>
              <div className="text-white/55">day reminders</div>
            </div>
            <div>
              <div className="text-xl font-bold">CGST·SGST·IGST</div>
              <div className="text-white/55">invoice breakup</div>
            </div>
            <div>
              <div className="text-xl font-bold">PDF · XLSX</div>
              <div className="text-white/55">exports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
