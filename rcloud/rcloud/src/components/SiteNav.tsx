import Nav from "./Nav";
import { navLinks } from "@/lib/data/site";
import { getSiteVisibility } from "@/lib/server/siteVisibility";

export const dynamic = "force-dynamic";

/**
 * Server wrapper that filters nav links based on site visibility toggles.
 * Keeps Nav as a client component for interactivity, but filtering happens
 * server-side before HTML is sent (data-friendly).
 */
export default async function SiteNav() {
  const visibility = await getSiteVisibility();

  const filtered = navLinks.filter((link) => {
    switch (link.href) {
      case "/room-finder":
        return visibility.showRoomfinder;
      case "/resources":
        return visibility.showResources;
      case "/transparency":
        return visibility.showTransparency;
      case "/projects":
        return visibility.showProjects;
      case "/constituency":
        return visibility.showConstituency;
      case "/officers":
        return visibility.showOfficers;
      case "/about":
        return visibility.showAbout;
      case "/":
        return true; // Home always visible
      default:
        return true;
    }
  });

  return <Nav links={filtered as any} />;
}
