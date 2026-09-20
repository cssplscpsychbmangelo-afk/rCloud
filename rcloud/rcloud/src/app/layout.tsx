import type { Metadata } from "next";
import { Inter, Reddit_Sans } from "next/font/google";
import { site } from "@/lib/data/site";
import { SITE_URL } from "@/lib/security/siteUrl";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const reddit = Reddit_Sans({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-reddit",
  display: "swap",
});

export const metadata: Metadata = {
  /**
   * `metadataBase` + a self-referential canonical link (`./` resolves to the
   * page actually being rendered) tell search engines which address is the
   * official one. A copycat can mirror this HTML, but it cannot claim this
   * canonical URL — that is what keeps the real rCloud above a scraped clone
   * in search results.
   */
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  alternates: { canonical: "./" },
  title: {
    default: "rCloud — CSSP Local Student Council",
    template: "%s · rCloud",
  },
  description: site.intro[0],
  applicationName: "rCloud",
  icons: { icon: site.logo },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    url: "./",
    title: "rCloud — CSSP Local Student Council",
    description: site.tagline,
    siteName: "rCloud",
  },
};

/**
 * Root layout — shell only (html, fonts, global styles).
 *
 * The public navigation and footer live in the `(site)` route group so the
 * /admin area is never wrapped in public-site chrome: admin pages show admin
 * navigation only.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${reddit.variable}`}>
      <body className="min-h-screen bg-night font-sans text-snow antialiased">
        {children}
      </body>
    </html>
  );
}
