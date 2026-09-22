import { eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { projects, resources, roomfinderSettings } from "@/lib/server/schema";
import { getBudgetSummary } from "@/lib/server/queries";
import { getSiteVisibility } from "@/lib/server/siteVisibility";
import { refreshConstituency, refreshRoomfinder } from "@/lib/server/actions";
import DashboardBoard, {
  type QuickAction,
} from "@/components/admin/DashboardBoard";
import { getSession } from "@/lib/server/auth";
import { roleLabels, rolePermissions, type Role } from "@/lib/server/permissions";
import { visibleAdminNav } from "@/lib/adminNav";
import { formatPeso } from "@/lib/format";
import { Card, PageHeader, Warn } from "@/components/admin/Ui";
import { StatCard } from "@/components/Cards";
import { ensureSchema } from "@/lib/server/migrate";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  await ensureSchema();
  const [allResources, allProjects, summary, roomfinderRow, visibility] = await Promise.all([
    db.select().from(resources),
    db.select().from(projects),
    getBudgetSummary(),
    db
      .select({ sheetId: roomfinderSettings.sheetId })
      .from(roomfinderSettings)
      .where(eq(roomfinderSettings.id, 1))
      .limit(1),
    getSiteVisibility(),
  ]);

  const role = session?.role ?? "";
  const perms = rolePermissions[role as Role] ?? [];
  // The dashboard card itself is not useful as a "go to" link.
  const destinations = visibleAdminNav(role).filter(
    (item) => item.href !== "/admin",
  );

  const published = allProjects.filter((p) => p.published);
  const count = (status: string) =>
    published.filter((p) => p.status === status).length;
  const overBudget = published.filter(
    (p) => p.actualExpenditure > p.approvedBudget,
  );

  // Quick actions are derived from the same role permissions as the section
  // grid, so nobody is ever offered a button they cannot use.
  const allowed = (href: string) =>
    destinations.some((item) => item.href === href);
  const quickActions: QuickAction[] = [
    allowed("/admin/announcements") && {
      href: "/admin/announcements",
      label: "Post an announcement",
      hint: "Write the advisory that appears first on the home page.",
      icon: "bell" as const,
    },
    allowed("/admin/resources") && {
      href: "/admin/resources",
      label: "Add a resource",
      hint: "Publish a document, form or link to the resource library.",
      icon: "folder" as const,
    },
    allowed("/admin/projects") && {
      href: "/admin/projects",
      label: "Start a project",
      hint: "Register a project, its budget and its progress.",
      icon: "file" as const,
    },
    allowed("/admin/officers") && {
      href: "/admin/officers",
      label: "Update the roster",
      hint: "Add officers, photos, positions and display order.",
      icon: "users" as const,
    },
    allowed("/admin/budget") && {
      href: "/admin/budget",
      label: "Set the budget",
      hint: "Total LSC budget plus each project's allocation.",
      icon: "coins" as const,
    },
    allowed("/admin/roomfinder") && {
      href: "/admin/roomfinder",
      label: "Roomivility schedule",
      hint: "Sync the room Sheet or upload a file for the Room Finder.",
      icon: "door" as const,
    },
    allowed("/admin/site-visibility") && {
      href: "/admin/site-visibility",
      label: "Show or hide pages",
      hint: "Turn public pages and home sections on or off.",
      icon: "shield" as const,
    },
    allowed("/admin/account") && {
      href: "/admin/account",
      label: "Account & password",
      hint: "Change the sign-in email or password for this admin.",
      icon: "list" as const,
    },
  ].filter(Boolean) as QuickAction[];

  const publicLinks = [
    { href: "/", label: "Home" },
    allowed("/admin/resources") && { href: "/resources", label: "Resources" },
    visibility.showRoomfinder && { href: "/room-finder", label: "Roomivility" },
    visibility.showProjects && { href: "/projects", label: "Projects" },
    visibility.showOfficers && { href: "/officers", label: "Officers" },
    visibility.showTransparency && { href: "/transparency", label: "Transparency" },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${session?.name} (${roleLabels[role as Role] ?? role}). This account can manage: ${perms.join(", ") || "nothing yet"}.`}
      />

      {params?.denied && (
        <Warn>
          Your role does not include that area. Budget, Constituency and Account
          are reserved for the Head Admin (Governor &amp; Vice Governor).
        </Warn>
      )}

      {/* ------------- Interactive board: quick actions + sections ---------- */}
      <DashboardBoard
        sections={destinations.map((item) => ({
          href: item.href,
          label: item.label,
          description: item.description,
        }))}
        quickActions={quickActions}
        publicLinks={publicLinks}
        refreshConstituency={
          perms.includes("constituency") ? refreshConstituency : undefined
        }
        refreshRoomfinder={
          perms.includes("roomfinder") ? refreshRoomfinder : undefined
        }
        roomfinderReady={Boolean(roomfinderRow[0]?.sheetId)}
      />

      {destinations.length === 0 && (
        <Card>
          <p className="text-sm text-mist">
            No admin sections are available to this account yet.
          </p>
        </Card>
      )}

      {/* ------------------------------ Summary ---------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Resources" value={String(allResources.length)} hint={`${allResources.filter((r) => r.active).length} active`} />
        <StatCard label="Active Projects" value={String(published.length)} hint="published" />
        <StatCard label="Pending" value={String(count("Pending"))} />
        <StatCard label="Ongoing" value={String(count("Ongoing"))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completed" value={String(count("Completed"))} />
        <StatCard label="Total LSC Budget" value={formatPeso(summary.totalBudget)} />
        <StatCard label="Total Utilized" value={formatPeso(summary.utilized)} />
        <StatCard label="Total Remaining" value={formatPeso(summary.allocated - summary.utilized)} hint={`allocated ${formatPeso(summary.allocated)}`} />
      </div>

      {overBudget.length > 0 && (
        <Card>
          <h2 className="font-display text-base font-bold text-snow">
            Over-budget warnings
          </h2>
          <ul className="mt-3 space-y-2">
            {overBudget.map((p) => (
              <li key={p.id}>
                <Warn>
                  {p.name}: expenditure {formatPeso(p.actualExpenditure)} exceeds
                  approved budget {formatPeso(p.approvedBudget)} by{" "}
                  {formatPeso(p.actualExpenditure - p.approvedBudget)}.
                </Warn>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
