import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old addresses from before the Products section existed.
  async redirects() {
    return [
      { source: "/demos", destination: "/products", permanent: true },
      { source: "/demos/login", destination: "/products/login-using-aws", permanent: true },
    ];
  },
};

export default nextConfig;
