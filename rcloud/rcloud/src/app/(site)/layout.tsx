import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

/**
 * Public-site shell. Everything here is the visitor-facing chrome; keeping it
 * in this route group means admin pages (which live outside the group) render
 * without public navigation or footer links.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-vio-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-snow"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
