import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Arena live-preview proxy host to use dev resources (HMR)
  // when running `next dev`. Production (`next start`) is unrestricted.
  allowedDevOrigins: [
    "3000-idqp57dpo5durc80529pf.e2b.app",
    "*.e2b.app",
  ],
};

export default nextConfig;
