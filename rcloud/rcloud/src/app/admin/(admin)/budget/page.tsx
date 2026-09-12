import { asc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { budget, projects } from "@/lib/server/schema";
import { saveBudget, saveProjectFinance } from "@/lib/server/actions";
import { getBudgetSummary } from "@/lib/server/queries";
import {
  btnAdmin,
  btnGhostAdmin,
  Card,
  Field,
  inputCls,
  Notice,
  PageHeader,
} from "@/components/admin/Ui";
import { StatCard } from "@/components/Cards";
import { formatPeso } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminBudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requirePermission("finance");
  const params = await searchParams;
  const summary = await getBudgetSummary();
  const [row] = await db.select({ updatedAt: budget.updatedAt }).from(budget);
  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.name));

  const allocated = summary.allocated;
  const unallocated = summary.totalBudget - allocated;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        description="Full budget configuration for the Head Admin: set the overall LSC budget and configure the approved budget and expenditure of every project here. Allocated, utilized and remaining are computed automatically from published projects — the public Transparency page updates instantly."
      />

      {params?.saved && <Notice>Project budget saved.</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total LSC Budget" value={formatPeso(summary.totalBudget)} />
        <StatCard label="Total Allocated" value={formatPeso(allocated)} hint="sum of approved budgets" />
        <StatCard label="Total Utilized" value={formatPeso(summary.utilized)} hint="sum of expenditures" />
        <StatCard label="Total Remaining" value={formatPeso(allocated - summary.utilized)} />
      </div>

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          Update overall budget
        </h2>
        <form action={saveBudget} className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Total LSC budget (₱)" className="w-56">
            <input
              name="totalBudget"
              type="number"
              min={0}
              required
              defaultValue={summary.totalBudget}
              className={inputCls}
            />
          </Field>
          <button type="submit" className={btnAdmin}>
            Save budget
          </button>
        </form>
        <p className="mt-3 text-xs text-mist">
          Unallocated council fund:{" "}
          <span className="tnum font-semibold text-snow">
            {formatPeso(unallocated)}
          </span>{" "}
          (total budget minus what is allocated to published projects).
        </p>
        {row && (
          <p className="tnum mt-3 text-xs text-dim">
            Last updated {row.updatedAt.toISOString().slice(0, 10)}
          </p>
        )}
      </Card>

      {/* ------------------- per-project budget configuration ------------------ */}
      <Card className="p-0">
        <div className="p-5">
          <h2 className="font-display text-base font-bold text-snow">
            Project budgets
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-mist">
            Edit any project&apos;s approved budget and actual expenditure
            directly here — no need to open Projects. Only{" "}
            <span className="font-semibold text-snow">published</span> projects
            count toward the totals above.
          </p>
        </div>

        <div className="hidden gap-3 border-y border-line bg-night/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dim sm:grid sm:grid-cols-[minmax(0,1fr)_9rem_9rem_7rem_5.5rem]">
          <span>Project</span>
          <span>Approved (₱)</span>
          <span>Expenditure (₱)</span>
          <span>Remaining</span>
          <span />
        </div>

        <div className="divide-y divide-line">
          {allProjects.map((project) => {
            const remaining =
              project.approvedBudget - project.actualExpenditure;
            const over = remaining < 0;
            return (
              <form
                key={project.id}
                action={saveProjectFinance}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_7rem_5.5rem] sm:items-center"
              >
                <input type="hidden" name="id" value={project.id} />
                <input type="hidden" name="returnTo" value="budget" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-snow">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-dim">
                    {project.status}
                    {project.published ? " · published" : " · hidden"}
                  </p>
                </div>
                <input
                  name="approvedBudget"
                  type="number"
                  min={0}
                  aria-label={`Approved budget for ${project.name}`}
                  defaultValue={project.approvedBudget}
                  className={`${inputCls} tnum`}
                />
                <input
                  name="actualExpenditure"
                  type="number"
                  min={0}
                  aria-label={`Actual expenditure for ${project.name}`}
                  defaultValue={project.actualExpenditure}
                  className={`${inputCls} tnum`}
                />
                <p
                  className={`tnum text-sm font-semibold ${over ? "text-bad" : "text-snow"}`}
                >
                  {formatPeso(remaining)}
                  {over && (
                    <span className="mt-0.5 block text-[11px] font-normal text-bad">
                      over budget
                    </span>
                  )}
                </p>
                <button type="submit" className={btnGhostAdmin}>
                  Save
                </button>
              </form>
            );
          })}
          {allProjects.length === 0 && (
            <p className="px-5 py-6 text-sm text-dim">
              No projects yet — add one in the Projects section.
            </p>
          )}
        </div>
      </Card>

      <div className="mt-4">
        <Notice>
          Changes here are reflected on the public Transparency page immediately
          — no code changes needed.
        </Notice>
      </div>
    </div>
  );
}
