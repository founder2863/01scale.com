import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old addresses from before the Products section existed.
  async redirects() {
    return [
      { source: "/demos", destination: "/products", permanent: true },
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
