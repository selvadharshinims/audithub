import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@audithub/types"],
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
