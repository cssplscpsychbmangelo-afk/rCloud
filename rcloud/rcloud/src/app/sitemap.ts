import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/security/siteUrl";

/**
 * Sitemap of the public pages (`/sitemap.xml`).
 *
 * Admin routes are deliberately absent: `/admin` never appears here, and
 * `robots.ts` disallows it as well. Publishing an accurate list of real pages
 * is itself anti-copycat work — it gives search engines the official map of the
 * site, which is what lets them rank the original above a scraped mirror.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL ?? "http://localhost:3000";
  const lastModified = new Date();

  const pages: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/room-finder", priority: 0.9, changeFrequency: "daily" },
    { path: "/resources", priority: 0.9, changeFrequency: "weekly" },
    { path: "/transparency", priority: 0.8, changeFrequency: "weekly" },
    { path: "/projects", priority: 0.8, changeFrequency: "weekly" },
    { path: "/constituency", priority: 0.7, changeFrequency: "weekly" },
    { path: "/officers", priority: 0.6, changeFrequency: "monthly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  ];

  return pages.map((page) => ({
    url: `${base}${page.path === "/" ? "" : page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
