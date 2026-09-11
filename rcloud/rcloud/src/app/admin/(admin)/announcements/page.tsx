import { desc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { announcements } from "@/lib/server/schema";
import {
  deleteAnnouncement,
  saveAnnouncement,
  toggleAnnouncement,
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

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  await requirePermission("content");
  const params = await searchParams;
  const rows = await db.select().from(announcements).orderBy(desc(announcements.publishedAt));
  const editing = rows.find((a) => a.id === params?.edit) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Create, publish, feature or remove council advisories. The public home feed updates automatically."
      />
      {params?.error && <Warn>A title is required.</Warn>}

      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          {editing ? `Edit: ${editing.title}` : "New announcement"}
        </h2>
        <form action={saveAnnouncement} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <Field label="Title">
            <input name="title" required defaultValue={editing?.title ?? ""} className={inputCls} />
          </Field>
          <Field label="Category">
            <input name="category" defaultValue={editing?.category ?? "Advisory"} className={inputCls} />
          </Field>
          <Field label="Content" className="sm:col-span-2">
            <textarea name="content" rows={3} defaultValue={editing?.content ?? ""} className={textareaCls} />
          </Field>
          <Field label="External link (optional)">
            <input name="externalUrl" defaultValue={editing?.externalUrl ?? ""} placeholder="https://…" className={inputCls} />
          </Field>
          <Field label="Publish date">
            <input
              name="publishedAt"
              type="date"
              defaultValue={editing?.publishedAt.toISOString().slice(0, 10) ?? ""}
              className={inputCls}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="featured" defaultChecked={editing ? editing.featured : false} className="h-4 w-4 accent-vio-500" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" name="active" defaultChecked={editing ? editing.active : true} className="h-4 w-4 accent-vio-500" />
            Active (published)
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" className={btnAdmin}>
              {editing ? "Save changes" : "Publish announcement"}
            </button>
            {editing && <a href="/admin/announcements" className={btnGhostAdmin}>Cancel</a>}
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>Title</Th><Th>Category</Th><Th>Published</Th><Th>State</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id}>
                <Td className="font-semibold text-snow">{row.title}</Td>
                <Td>{row.category}</Td>
                <Td className="tnum">{row.publishedAt.toISOString().slice(0, 10)}</Td>
                <Td>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                    {row.featured && <span className="text-vio-300">featured </span>}
                    <span className={row.active ? "text-ok" : "text-bad"}>
                      {row.active ? "active" : "unpublished"}
                    </span>
                  </span>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <RowAction action={toggleAnnouncement} id={row.id} label={row.active ? "Unpublish" : "Publish"} extra={{ flag: "active" }} />
                    <RowAction action={toggleAnnouncement} id={row.id} label={row.featured ? "Unfeature" : "Feature"} extra={{ flag: "featured" }} />
                    <a href={`/admin/announcements?edit=${row.id}`} className={btnGhostAdmin}>Edit</a>
                    <RowAction action={deleteAnnouncement} id={row.id} label="Delete" tone="danger" />
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
