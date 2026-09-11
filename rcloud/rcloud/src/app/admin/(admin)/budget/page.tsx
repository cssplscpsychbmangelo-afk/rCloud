import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { budget } from "@/lib/server/schema";
import { saveBudget } from "@/lib/server/actions";
import { getBudgetSummary } from "@/lib/server/queries";
import {
  btnAdmin,
  Card,
  Field,
  inputCls,
  Notice,
  PageHeader,
} from "@/components/admin/Ui";
import { StatCard } from "@/components/Cards";
import { formatPeso } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminBudgetPage() {
  await requirePermission("finance");
  const summary = await getBudgetSummary();
  const [row] = await db.select({ updatedAt: budget.updatedAt }).from(budget);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        description="Set the overall LSC budget. Allocated, utilized and remaining are computed automatically from published projects — the public Transparency page updates instantly."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total LSC Budget" value={formatPeso(summary.totalBudget)} />
        <StatCard label="Total Allocated" value={formatPeso(summary.allocated)} hint="sum of approved budgets" />
        <StatCard label="Total Utilized" value={formatPeso(summary.utilized)} hint="sum of expenditures" />
        <StatCard label="Total Remaining" value={formatPeso(summary.allocated - summary.utilized)} />
      </div>

      <Card>
        <h2 className="font-display text-base font-bold text-snow">Update overall budget</h2>
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
          <button type="submit" className={btnAdmin}>Save budget</button>
        </form>
        <div className="mt-4">
          <Notice>
            Changes here are reflected on the public Transparency page immediately — no code changes needed.
          </Notice>
        </div>
        {row && (
          <p className="tnum mt-3 text-xs text-dim">
            Last updated {row.updatedAt.toISOString().slice(0, 10)}
          </p>
        )}
      </Card>
    </div>
  );
}
