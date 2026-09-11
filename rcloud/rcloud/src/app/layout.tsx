import type { Metadata } from "next";
import { Inter, Reddit_Sans } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${reddit.variable}`}>
      <body className="min-h-screen bg-night font-sans text-snow antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-vio-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-snow"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
