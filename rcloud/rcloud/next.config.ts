import type { NextConfig } from "next";
import {
  adminHeaders,
  privateApiHeaders,
  securityHeaders,
} from "./src/lib/security/policy";

/**
 * Security headers are the main reason this file is more than a stub.
 *
 * Netlify's `netlify.toml`/`_headers` rules are applied by the edge to the
 * files Netlify serves itself; they do not reliably reach responses that the
 * Next.js runtime produces (HTML pages, `/api/*`, server actions). Declaring
 * them here as well is what guarantees every response carries them.
 *
 * The values live in `src/lib/security/policy.ts` so that `netlify.toml`,
 * `public/_headers` and this file cannot drift apart unnoticed
 * (`npm run check:headers`).
 */
const dev = process.env.NODE_ENV !== "production";

const policy = {
  dev,
  // Netlify sets CONTEXT=production on the live site and
  // deploy-preview/branch-deploy for the throwaway copies of it.
  deployContext: process.env.CONTEXT,
};

const toNextHeaders = (headers: Record<string, string>) =>
  Object.entries(headers).map(([key, value]) => ({ key, value }));

const nextConfig: NextConfig = {
  // Don't advertise the framework in every response.
  poweredByHeader: false,

  // Allow the Arena live-preview proxy host to use dev resources (HMR)
  // when running `next dev`. Production (`next start`) is unrestricted.
  allowedDevOrigins: [
    "3000-idqp57dpo5durc80529pf.e2b.app",
    "*.e2b.app",
  ],

  async headers() {
    // Next.js applies the *last* matching rule, so the broad rule comes first
    // and the specific ones below override it.
    return [
      {
        source: "/:path*",
        headers: toNextHeaders(securityHeaders(policy)),
      },
      {
        source: "/admin/:path*",
        headers: toNextHeaders(adminHeaders()),
      },
      {
        source: "/api/constituency/:path*",
        headers: toNextHeaders(privateApiHeaders()),
      },
    ];
  },
};

export default nextConfig;
