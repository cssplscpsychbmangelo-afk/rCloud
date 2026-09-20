import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/security/siteUrl";

/**
 * `robots.txt` (next dev / next start / Netlify all serve this at `/robots.txt`).
 *
 * Two jobs:
 *  1. Keep crawlers out of `/admin` and `/api` — the admin panel is protected by
 *     auth and rate limiting, but it should never be listed in a search engine
 *     in the first place.
 *  2. Point crawlers at the canonical sitemap so the *real* rCloud is the copy
 *     that gets indexed, not a clone that scraped it.
 *
 * Note this is a polite convention, not a security control: an attacker's
 * crawler ignores it. It exists to keep honest engines and spammers apart.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    ...(SITE_URL ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
