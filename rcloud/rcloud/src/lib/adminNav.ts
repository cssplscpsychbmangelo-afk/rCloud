/**
 * Admin navigation — the single source for the admin sidebar and the
 * dashboard's navigation grid, so both accounts always see the same links.
 *
 * Every item is an admin page (never a public-site page) and is filtered by
 * the signed-in role's permissions:
 *   - head_admin (Governor & Vice Governor) — everything
 *   - moderator  (Board Members)            — content areas only
 */

import { roleHasPermission, type Permission } from "@/lib/server/permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  /** Shown on the dashboard navigation cards. */
  description: string;
  /** null = every signed-in admin can see it. */
  perm: Permission | null;
};

export const adminNav: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    description:
      "Overview of content, projects, budget and constituency data at a glance.",
    perm: null,
  },
  {
    href: "/admin/resources",
    label: "Resources",
    description:
      "Add, edit, hide and reorder the links in the public resource library.",
    perm: "content",
  },
  {
    href: "/admin/officers",
    label: "Officers",
    description:
      "Manage the council cabinet, positions, photos and display order.",
    perm: "content",
  },
  {
    href: "/admin/projects",
    label: "Projects",
    description:
      "Create projects, update their status and publish them to Transparency.",
    perm: "content",
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    description: "Post council announcements and feature them on the home page.",
    perm: "content",
  },
  {
    href: "/admin/budget",
    label: "Budget",
    description:
      "Set the LSC budget and configure each project's approved budget and expenditure.",
    perm: "finance",
  },
  {
    href: "/admin/constituency",
    label: "Constituency",
    description:
      "Connect the Constituency Check Google Sheet and refresh its data.",
    perm: "constituency",
  },
  {
    href: "/admin/account",
    label: "Account",
    description:
      "Change the admin sign-in email and password. Main admin only.",
    perm: "account",
  },
];

/** The items the given role is allowed to open. */
export function visibleAdminNav(role: string): AdminNavItem[] {
  return adminNav.filter((item) => !item.perm || roleHasPermission(role, item.perm));
}
