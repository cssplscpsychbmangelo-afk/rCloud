import { asc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { officers } from "@/lib/server/schema";
import {
  deleteOfficer,
  moveOfficer,
  saveOfficer,
  toggleOfficer,
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
  Th,
  Warn,
} from "@/components/admin/Ui";

export const dynamic = "force-dynamic";

export default async function AdminOfficersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  await requirePermission("content");
  const params = await searchParams;
  const rows = await db.select().from(officers).orderBy(asc(officers.displayOrder));
  const editing = rows.find((o) => o.id === params?.edit) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Officers"
        description="Manage the cabinet: photos, names, positions, portfolios, order and visibility."
      />
      {params?.error && <Warn>{decodeURIComponent(params.error)}</Warn>}

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          {editing ? `Edit: ${editing.name}` : "Add officer"}
        </h2>
        <form action={saveOfficer} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <Field label="Full name">
            <input name="name" required defaultValue={editing?.name ?? ""} className={inputCls} />
          </Field>
          <Field label="Position">
            <input name="position" required defaultValue={editing?.position ?? ""} placeholder="Governor / Board Member" className={inputCls} />
          </Field>
          <Field label="Portfolio (program)">
            <input name="portfolio" defaultValue={editing?.portfolio ?? ""} placeholder="Psychology (leave empty for exec)" className={inputCls} />
          </Field>
          <Field label="Description">
            <input name="description" defaultValue={editing?.description ?? ""} className={inputCls} />
          </Field>
          <Field label="Photo upload (PNG/JPG/WebP, ≤400KB)">
            <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs text-mist file:me-3 file:rounded-lg file:border-0 file:bg-vio-950 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-vio-200" />
          </Field>
          <Field label="…or paste photo URL">
            <input name="photoUrl" defaultValue={editing?.photoUrl ?? ""} placeholder="https://…" className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="active" defaultChecked={editing ? editing.active : true} className="h-4 w-4 accent-vio-500" />
            Active (shown publicly)
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" className={btnAdmin}>
              {editing ? "Save changes" : "Add officer"}
            </button>
            {editing && <a href="/admin/officers" className={btnGhostAdmin}>Cancel</a>}
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[680px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>#</Th><Th>Officer</Th><Th>Position</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, index) => (
              <tr key={row.id}>
                <Td className="tnum">{index + 1}</Td>
                <Td className="font-semibold text-snow">{row.name}</Td>
                <Td>{row.portfolio ? `${row.position} — ${row.portfolio}` : row.position}</Td>
                <Td>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${row.active ? "text-ok" : "text-bad"}`}>
                    {row.active ? "active" : "inactive"}
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <RowAction action={moveOfficer} id={row.id} label="↑" extra={{ dir: "-1" }} disabled={index === 0} />
                    <RowAction action={moveOfficer} id={row.id} label="↓" extra={{ dir: "1" }} disabled={index === rows.length - 1} />
                    <RowAction action={toggleOfficer} id={row.id} label={row.active ? "Deactivate" : "Activate"} />
                    <a href={`/admin/officers?edit=${row.id}`} className={btnGhostAdmin}>Edit</a>
                    <RowAction action={deleteOfficer} id={row.id} label="Delete" tone="danger" />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
