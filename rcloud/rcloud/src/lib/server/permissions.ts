/** Role-based access control for the rCloud admin.
 *
 * Two shared accounts run the portal:
 *  - head_admin  → Governor & Vice Governor — full access
 *  - moderator   → Board Members — Content access only
 *
 * No administrator gets unrestricted access implicitly.
 */

export type Role = "head_admin" | "moderator";
export type Permission =
  | "content"
  | "finance"
  | "constituency"
  /** Sign-in credentials (email / password) — main admin only. */
  | "account";

export const rolePermissions: Record<Role, Permission[]> = {
  head_admin: ["content", "finance", "constituency", "account"],
  moderator: ["content"],
};

export const roleLabels: Record<Role, string> = {
  head_admin: "Head Admin · Gov & VG",
  moderator: "Moderator · Board Members",
};

export function roleHasPermission(role: string, permission: Permission): boolean {
  const perms = rolePermissions[role as Role];
  return Array.isArray(perms) && perms.includes(permission);
}

export function isRole(role: string): role is Role {
  return role in rolePermissions;
}
