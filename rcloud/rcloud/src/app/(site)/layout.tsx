import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { contacts, site } from "@/lib/data/site";
import { SITE_URL } from "@/lib/security/siteUrl";

/**
 * Structured data for the public pages (schema.org Organization).
 *
 * Search engines use this to build the "official site" panel for the council.
 * A clone that copies the HTML gets no benefit from it, because the `url` it
 * declares is rCloud's own address — the declaration belongs to the original.
 */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.org,
  alternateName: site.name,
  url: SITE_URL ?? undefined,
  logo: SITE_URL ? `${SITE_URL}${site.logo}` : undefined,
  parentOrganization: { "@type": "CollegeOrUniversity", name: site.parent },
  sameAs: contacts
    .filter((contact) => contact.href.startsWith("http"))
    .map((contact) => contact.href),
};

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
      <SiteNav />
      <main id="main">{children}</main>
      <Footer />
      <script
        type="application/ld+json"
        // JSON only — nothing here is executed by the browser.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
    </>
  );
}
