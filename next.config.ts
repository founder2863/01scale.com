import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old addresses from before the Products section existed.
  async redirects() {
    return [
      { source: "/demos", destination: "/products", permanent: true },
      // The DocFlow vision became the DocFlow page (MVP1-E0-32); the per-version pages from
      // PR #117 became one page per app with a tab per version.
      { source: "/products/vision", destination: "/products/docflow", permanent: true },
      { source: "/products/:app(docflow|autorep|p2pflow)-v1", destination: "/products/:app", permanent: true },
      { source: "/products/:app(docflow|autorep|p2pflow)-v2", destination: "/products/:app/v2", permanent: true },
      { source: "/products/services", destination: "/products#services", permanent: false },
      // V1 lives at the page's own address.
      { source: "/products/:app(docflow|autorep|p2pflow)/v1", destination: "/products/:app", permanent: true },
      { source: "/products/services/:service/v1", destination: "/products/services/:service", permanent: true },
      { source: "/demos/login", destination: "/products/login-using-aws", permanent: true },
      // Architecture moved under the Platform menu (MVP1-E0-22).
      { source: "/architecture", destination: "/platform/architecture", permanent: true },
      { source: "/platform", destination: "/platform/core", permanent: false },
      // Market Outlook is the module page itself (MVP1-E0-21).
      { source: "/products/:module/market-outlook", destination: "/products/:module", permanent: true },
    ];
  },
};

export default nextConfig;
