import { asc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { resources } from "@/lib/server/schema";
import {
  deleteResource,
  moveResource,
  saveResource,
  toggleResource,
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

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  await requirePermission("content");
  const params = await searchParams;
  const rows = await db.select().from(resources).orderBy(asc(resources.displayOrder));
  const editing = rows.find((r) => r.id === params?.edit) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Add, edit, reorder, feature or hide resources. The public Resources page updates automatically."
      />
      {params?.error && <Warn>Each resource needs at least a title and a URL.</Warn>}

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          {editing ? `Edit: ${editing.title}` : "Add resource"}
        </h2>
        <form action={saveResource} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <Field label="Title">
            <input name="title" required defaultValue={editing?.title ?? ""} className={inputCls} />
          </Field>
          <Field label="Category">
            <input name="category" defaultValue={editing?.category ?? ""} placeholder="Council Documents" className={inputCls} />
          </Field>
          <Field label="URL (Drive, Docs, external or internal path)" className="sm:col-span-2">
            <input name="url" required defaultValue={editing?.url ?? ""} className={inputCls} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea name="description" rows={2} defaultValue={editing?.description ?? ""} className={inputCls} />
          </Field>
          <Field label="Icon key">
            <select name="icon" defaultValue={editing?.icon ?? "folder"} className={inputCls}>
              {["folder", "file", "book", "scale", "coins", "users", "calendar", "clock", "heart", "chart"].map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
          </Field>
          <Field label="Tags (comma separated)">
            <input name="tags" defaultValue={editing?.tags ?? ""} className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="internal" defaultChecked={editing ? editing.internal : false} className="h-4 w-4 accent-vio-500" />
            Internal rCloud link
          </label>
          <label className="flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="featured" defaultChecked={editing ? editing.featured : false} className="h-4 w-4 accent-vio-500" />
            Featured (Quick Access)
          </label>
          <label className="flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="active" defaultChecked={editing ? editing.active : true} className="h-4 w-4 accent-vio-500" />
            Visible on public site
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" className={btnAdmin}>
              {editing ? "Save changes" : "Add resource"}
            </button>
            {editing && (
              <a href="/admin/resources" className={btnGhostAdmin}>Cancel</a>
            )}
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>#</Th><Th>Title</Th><Th>Category</Th><Th>State</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, index) => (
              <tr key={row.id}>
                <Td className="tnum">{index + 1}</Td>
                <Td className="font-semibold text-snow">{row.title}</Td>
                <Td>{row.category}</Td>
                <Td>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                    {row.featured && <span className="text-vio-300">featured </span>}
                    <span className={row.active ? "text-ok" : "text-bad"}>
                      {row.active ? "visible" : "hidden"}
                    </span>
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <RowAction action={moveResource} id={row.id} label="↑" extra={{ dir: "-1" }} disabled={index === 0} />
                    <RowAction action={moveResource} id={row.id} label="↓" extra={{ dir: "1" }} disabled={index === rows.length - 1} />
                    <RowAction action={toggleResource} id={row.id} label={row.featured ? "Unfeature" : "Feature"} extra={{ flag: "featured" }} />
                    <RowAction action={toggleResource} id={row.id} label={row.active ? "Hide" : "Show"} extra={{ flag: "active" }} />
                    <a href={`/admin/resources?edit=${row.id}`} className={btnGhostAdmin}>Edit</a>
                    <RowAction action={deleteResource} id={row.id} label="Delete" tone="danger" />
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
