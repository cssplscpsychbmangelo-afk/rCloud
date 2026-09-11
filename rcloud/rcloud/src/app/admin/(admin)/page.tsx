import { db } from "@/lib/server/db";
import { projects, resources } from "@/lib/server/schema";
import { getBudgetSummary } from "@/lib/server/queries";
import { getSession } from "@/lib/server/auth";
import { roleLabels, rolePermissions, type Role } from "@/lib/server/permissions";
import { formatPeso } from "@/lib/format";
import { Card, PageHeader, Warn } from "@/components/admin/Ui";
import { StatCard } from "@/components/Cards";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const [allResources, allProjects, summary] = await Promise.all([
    db.select().from(resources),
    db.select().from(projects),
    getBudgetSummary(),
  ]);

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
        description={`Signed in as ${session?.name} (${roleLabels[session?.role as Role] ?? session?.role}). Your role grants: ${(rolePermissions[session?.role as Role] ?? []).join(", ") || "no"} access.`}
      />

      {params?.denied && (
        <Warn>
          Your role does not include that area. Changes there require Finance
          or Constituency access held by the Governor or Vice Governor.
        </Warn>
      )}

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
