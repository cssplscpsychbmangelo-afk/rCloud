import Link from "next/link";
import { db } from "@/lib/server/db";
import { projects, resources } from "@/lib/server/schema";
import { getBudgetSummary } from "@/lib/server/queries";
import { getSession } from "@/lib/server/auth";
import { roleLabels, rolePermissions, type Role } from "@/lib/server/permissions";
import { visibleAdminNav } from "@/lib/adminNav";
import { formatPeso } from "@/lib/format";
import { Card, PageHeader, Warn } from "@/components/admin/Ui";
import { StatCard } from "@/components/Cards";
import { IconArrowRight } from "@/components/Icons";
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
  const [allResources, allProjects, summary] = await Promise.all([
    db.select().from(resources),
    db.select().from(projects),
    getBudgetSummary(),
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

      {/* ---------------------- Admin navigation only ---------------------- */}
      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          Admin sections
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          Everything below stays inside the admin panel.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {destinations.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-1.5 rounded-xl border border-line bg-night/40 p-4 transition-colors duration-200 hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 press"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-snow">
                  {item.label}
                </span>
                <IconArrowRight
                  size={15}
                  className="shrink-0 text-vio-300 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
              <span className="text-xs leading-relaxed text-mist">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
        {destinations.length === 0 && (
          <p className="mt-4 text-sm text-mist">
            No admin sections are available to this account yet.
          </p>
        )}
      </Card>

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
