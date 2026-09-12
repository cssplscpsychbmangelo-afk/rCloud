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

export const dynamic = "force-dynamic";

const STATUSES: ProjectStatus[] = ["Pending", "Ongoing", "Completed", "Cancelled"];

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  await requirePermission("content");
  const params = await searchParams;
  const session = await getSession();
  const isHeadAdmin = session?.role === "head_admin";
  const canFinance = session ? roleHasPermission(session.role, "finance") : false;
  const canFeature = session ? roleHasPermission(session.role, "feature") : false;
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  const editing = rows.find((p) => p.id === params?.edit) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Board Members submit projects for approval; Head Admins Approve or Reject in one click. Finance figures are restricted to Head Admins. Remaining is computed automatically."
      />
      {params?.error && <Warn>Missing required fields or an invalid upload.</Warn>}
      <Warn>
        Approve requests only for projects that were coordinated with the
        council beforehand. Unplanned or uncoordinated submissions should be
        rejected.
      </Warn>

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          {editing ? `Edit: ${editing.name}` : "Create project"}
        </h2>
        <form action={saveProjectDetails} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <Field label="Project name">
            <input name="name" required defaultValue={editing?.name ?? ""} className={inputCls} />
          </Field>
          <Field label="Category">
            <input name="category" defaultValue={editing?.category ?? ""} placeholder="Program / Event / Assistance" className={inputCls} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea name="description" rows={2} defaultValue={editing?.description ?? ""} className={textareaCls} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={editing?.status ?? "Pending"} className={inputCls}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              name="date"
              type="date"
              defaultValue={editing?.date ? editing.date.toISOString().slice(0, 10) : ""}
              className={inputCls}
            />
          </Field>
          <Field label="Project lead">
            <input name="projectLead" defaultValue={editing?.projectLead ?? ""} className={inputCls} />
          </Field>
          <Field label="Image upload or paste URL below">
            <input type="file" name="image" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs text-mist file:me-3 file:rounded-lg file:border-0 file:bg-vio-950 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-vio-200" />
          </Field>
          <Field label="Image URL (external link)" className="sm:col-span-2">
            <input name="imageUrl" defaultValue={editing?.imageUrl ?? ""} placeholder="https://… (Drive, FB album, etc.)" className={inputCls} />
          </Field>
          <Field label="Document links (one per line — Drive links welcome)" className="sm:col-span-2">
            <textarea name="documentLinks" rows={2} defaultValue={editing?.documentLinks ?? ""} className={textareaCls} />
          </Field>
          <Field label="Transparency notes" className="sm:col-span-2">
            <textarea name="transparencyNotes" rows={2} defaultValue={editing?.transparencyNotes ?? ""} className={textareaCls} />
          </Field>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" className={btnAdmin}>
              {editing ? "Save details" : isHeadAdmin ? "Create project" : "Submit project for approval"}
            </button>
            {editing && <a href="/admin/projects" className={btnGhostAdmin}>Close</a>}
          </div>
          <p className="text-xs leading-relaxed text-dim sm:col-span-2">
            New submissions from Board Members are marked{" "}
            <span className="font-semibold text-warn">pending review</span> until a
            Head Admin approves them — no need to edit before publishing.
          </p>
        </form>
      </Card>

      {editing && (
        <Card>
          <h2 className="font-display text-base font-bold text-snow">
            Finance — {editing.name}
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
                <button type="submit" className={btnAdmin}>Save finance</button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm text-mist">
              Budget and expenditure editing requires Head Admin (Finance) access.
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <p className="tnum rounded-xl border border-line bg-night/60 px-4 py-3 text-sm text-mist">
              Approved: <span className="font-bold text-snow">{formatPeso(editing.approvedBudget)}</span>
            </p>
            <p className="tnum rounded-xl border border-line bg-night/60 px-4 py-3 text-sm text-mist">
              Utilized: <span className="font-bold text-snow">{formatPeso(editing.actualExpenditure)}</span>
            </p>
            <p className="tnum rounded-xl border border-line bg-night/60 px-4 py-3 text-sm text-mist">
              Remaining: <span className="font-bold text-snow">{formatPeso(editing.approvedBudget - editing.actualExpenditure)}</span>
            </p>
          </div>
          {editing.actualExpenditure > editing.approvedBudget && (
            <div className="mt-4">
              <Warn>
                Expenditure exceeds the approved budget by{" "}
                {formatPeso(editing.actualExpenditure - editing.approvedBudget)}.
                Review and liquidate before publishing further updates.
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
