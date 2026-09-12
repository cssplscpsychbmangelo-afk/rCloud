import type { Metadata } from "next";
import { Inter, Reddit_Sans } from "next/font/google";
import { site } from "@/lib/data/site";
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
  title: {
    default: "rCloud — CSSP Local Student Council",
    template: "%s · rCloud",
  },
  description: site.intro[0],
  icons: { icon: site.logo },
  openGraph: {
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
