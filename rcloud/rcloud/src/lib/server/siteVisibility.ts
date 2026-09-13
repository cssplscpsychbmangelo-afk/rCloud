import { db } from "./db";
import { siteSettings } from "./schema";
import { ensureSchema } from "./migrate";

export type SiteVisibility = {
  showRoomfinder: boolean;
  showAnnouncements: boolean;
  showResources: boolean;
  showTransparency: boolean;
  showProjects: boolean;
  showConstituency: boolean;
  showOfficers: boolean;
  showAbout: boolean;
};

const DEFAULT_VISIBILITY: SiteVisibility = {
  showRoomfinder: true,
  showAnnouncements: true,
  showResources: true,
  showTransparency: true,
  showProjects: true,
  showConstituency: true,
  showOfficers: true,
  showAbout: true,
};

export async function getSiteVisibility(): Promise<SiteVisibility> {
  await ensureSchema();
  try {
    const [row] = await db.select().from(siteSettings).limit(1);
    if (!row) return DEFAULT_VISIBILITY;
    return {
      showRoomfinder: row.showRoomfinder ?? true,
      showAnnouncements: row.showAnnouncements ?? true,
      showResources: row.showResources ?? true,
      showTransparency: row.showTransparency ?? true,
      showProjects: row.showProjects ?? true,
      showConstituency: row.showConstituency ?? true,
      showOfficers: row.showOfficers ?? true,
      showAbout: row.showAbout ?? true,
    };
  } catch {
    // If table doesn't exist yet (first deploy before migration), fall back to defaults
    return DEFAULT_VISIBILITY;
  }
}

export function isPageVisible(visibility: SiteVisibility, key: string): boolean {
  switch (key) {
    case "roomfinder":
    case "roomivility":
      return visibility.showRoomfinder;
    case "announcements":
      return visibility.showAnnouncements;
    case "resources":
      return visibility.showResources;
    case "transparency":
      return visibility.showTransparency;
    case "projects":
      return visibility.showProjects;
    case "constituency":
      return visibility.showConstituency;
    case "officers":
      return visibility.showOfficers;
    case "about":
      return visibility.showAbout;
    default:
      return true;
  }
}
