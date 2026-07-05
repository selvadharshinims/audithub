import type { NextConfig } from "next";

// API origin (for connect-src) — derived from the public API URL.
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").origin;
  } catch {
    return "http://localhost:4000";
  }
})();

// A pragmatic Content-Security-Policy. It locks down the dangerous vectors
// (object/base/frame-ancestors, and where scripts/data may load/connect) while
// still allowing Next.js to run. A fully strict, nonce-based script-src is the
// next step and is best done alongside an HTTPS deployment.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  `connect-src 'self' ${apiOrigin} ws: wss: https:`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle (.next/standalone) so the app can run in
  // a lean Docker image (Coolify/any container host) without the full monorepo.
  output: "standalone",
  transpilePackages: ["@audithub/types"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // typedRoutes is too strict for dynamic hrefs coming from the API
  // (notification links, sidebar sections, palette results).
  typedRoutes: false,
  webpack: (webpackConfig) => {
    // Let Webpack resolve `.js` imports to `.ts` sources — the shared
    // packages use NodeNext-style `.js` extensions so the API can import
    // them, but the actual files are `.ts`.
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.extensionAlias = {
      ...(webpackConfig.resolve.extensionAlias ?? {}),
      ".js": [".js", ".ts", ".tsx"],
    };
    return webpackConfig;
  },
};

export default config;
