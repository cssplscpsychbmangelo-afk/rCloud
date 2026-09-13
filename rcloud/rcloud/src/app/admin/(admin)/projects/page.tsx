import { desc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { projects } from "@/lib/server/schema";
import { getSession } from "@/lib/server/auth";
import { roleHasPermission } from "@/lib/server/permissions";
import {
  deleteProject,
  saveProjectDetails,
  saveProjectFinance,
  setProjectApproval,
} from "@/lib/server/actions";
import {
  btnAdmin,
  btnGhostAdmin,
  Card,
  Field,
  inputCls,
  PageHeader,
  RowAction,
  Td,
  textareaCls,
  Th,
  Warn,
} from "@/components/admin/Ui";
import { StatusBadge } from "@/components/Primitives";
import { formatPeso } from "@/lib/format";
import type { ProjectStatus } from "@/lib/types";
import { ensureSchema } from "@/lib/server/migrate";

export const dynamic = "force-dynamic";

const STATUSES: ProjectStatus[] = ["Pending", "Ongoing", "Completed", "Cancelled"];

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  await requirePermission("content");
  await ensureSchema();
  const params = await searchParams;
  const session = await getSession();
  const isHeadAdmin = session?.role === "head_admin";
  const canFinance = session ? roleHasPermission(session.role, "finance") : false;
  const canFeature = session ? roleHasPermission(session.role, "feature") : false;
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  const editing = rows.find((p) => p.id === params?.edit) ?? null;

  // Budget balances for the project being added/edited — a brand-new project
  // starts at ₱0 / ₱0 / ₱0 and is funded later from the Budget section.
  const approved = editing?.approvedBudget ?? 0;
  const utilized = editing?.actualExpenditure ?? 0;
  const remaining = approved - utilized;
  const overBudget = remaining < 0;
  const balances = [
    { label: "Approved", value: formatPeso(approved), warn: false },
    { label: "Utilized", value: formatPeso(utilized), warn: false },
    { label: "Remaining", value: formatPeso(remaining), warn: overBudget },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Add a project with its name, description and status — nothing else is required. Board Members submit projects for approval; Head Admins Approve or Reject in one click. Budget figures stay in the Budget section."
      />
      {params?.error && <Warn>Add a project name before saving.</Warn>}
      <Warn>
        Approve requests only for projects that were coordinated with the
        council beforehand. Unplanned or uncoordinated submissions should be
        rejected.
      </Warn>

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          {editing ? `Edit: ${editing.name}` : "Add project"}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          {editing
            ? "Only the name, description, status and photo link are editable."
            : "Project name and description are all you need — the photo link is optional."}
        </p>
        <form action={saveProjectDetails} className="mt-4 grid gap-4">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <Field label="Project name">
            <input
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              placeholder="e.g. Baha Relief Drive"
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <textarea
              name="description"
              rows={3}
              defaultValue={editing?.description ?? ""}
              placeholder="What the project is for and who it serves."
              className={textareaCls}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select
                name="status"
                defaultValue={editing?.status ?? "Pending"}
                className={inputCls}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </Field>
            <Field label="Photo link (optional)">
              <input
                name="imageUrl"
                type="url"
                defaultValue={editing?.imageUrl ?? ""}
                placeholder="https://… (Drive, FB album, etc.)"
                className={inputCls}
              />
            </Field>
          </div>

          {/* ------------------------- budget balances ------------------------- */}
          <div className="rounded-xl border border-line bg-night/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
              Budget balance
            </p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              {balances.map(({ label, value, warn }) => (
                <div
                  key={label}
                  className="rounded-xl border border-line bg-panel-2 px-4 py-3 text-center"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
                    {label}
                  </dt>
                  <dd
                    className={`tnum mt-1.5 font-display text-xl font-extrabold tracking-tight ${
                      warn ? "text-warn" : "text-snow"
                    }`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-mist">
              {editing
                ? "Update the approved budget and expenditure below (Head Admin) or in the Budget section — remaining is computed automatically."
                : "New projects start at ₱0. Set the approved budget and expenditure in the Budget section once the project is added."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={btnAdmin}>
              {editing ? "Save project" : isHeadAdmin ? "Add project" : "Submit project for approval"}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-dim">
            New submissions from Board Members are marked{" "}
            <span className="font-semibold text-warn">pending review</span> until
            a Head Admin approves them — no need to edit before publishing.
          </p>
        </form>
      </Card>

      {editing && (
        <Card>
          <h2 className="font-display text-base font-bold text-snow">
            Budget — {editing.name}
          </h2>
          {canFinance ? (
            <form action={saveProjectFinance} className="mt-4 grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="id" value={editing.id} />
              <Field label="Approved budget (₱)">
                <input name="approvedBudget" type="number" min={0} required defaultValue={editing.approvedBudget} className={inputCls} />
              </Field>
              <Field label="Actual expenditure (₱)">
                <input name="actualExpenditure" type="number" min={0} required defaultValue={editing.actualExpenditure} className={inputCls} />
              </Field>
              <div className="flex items-end">
                <button type="submit" className={btnAdmin}>Save budget</button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm text-mist">
              Budget and expenditure editing requires Head Admin (Finance) access.
            </p>
          )}
          {overBudget && (
            <div className="mt-4">
              <Warn>
                Expenditure exceeds the approved budget by{" "}
                {formatPeso(-remaining)}. Review and liquidate before publishing
                further updates.
              </Warn>
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>Project</Th><Th>Status</Th><Th>Approved</Th><Th>Utilized</Th><Th>Remaining</Th><Th>State</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const over = row.actualExpenditure > row.approvedBudget;
              return (
                <tr key={row.id}>
                  <Td className="font-semibold text-snow">{row.name}</Td>
                  <Td><StatusBadge status={row.status as ProjectStatus} /></Td>
                  <Td className="tnum">{formatPeso(row.approvedBudget)}</Td>
                  <Td className="tnum">{formatPeso(row.actualExpenditure)}</Td>
                  <Td className={`tnum font-semibold ${over ? "text-warn" : "text-snow"}`}>
                    {formatPeso(row.approvedBudget - row.actualExpenditure)}
                    {over && " ⚠"}
                  </Td>
                  <Td>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                        row.published
                          ? "text-ok"
                          : row.approvalStatus === "rejected"
                            ? "text-bad"
                            : "text-warn"
                      }`}
                    >
                      {row.published
                        ? "approved"
                        : row.approvalStatus === "rejected"
                          ? "rejected"
                          : "pending review"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`/admin/projects?edit=${row.id}`} className={btnGhostAdmin}>Edit</a>
                      {canFeature && !row.published && (
                        <>
                          <RowAction action={setProjectApproval} id={row.id} label="Approve" extra={{ decision: "approve" }} tone="ok" />
                          <RowAction action={setProjectApproval} id={row.id} label="Reject" extra={{ decision: "reject" }} tone="danger" />
                        </>
                      )}
                      {canFeature && row.published && (
                        <RowAction action={setProjectApproval} id={row.id} label="Unpublish" extra={{ decision: "unpublish" }} />
                      )}
                      <RowAction action={deleteProject} id={row.id} label="Delete" tone="danger" />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
