import { asc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import { officers, officerAvailability } from "@/lib/server/schema";
import {
  clearOfficerAvailability,
  deleteOfficer,
  deleteOfficerAvailability,
  loadOfficerAvailability,
  moveOfficer,
  saveOfficer,
  saveOfficerAvailability,
  toggleOfficer,
} from "@/lib/server/actions";
import { ensureSchema } from "@/lib/server/migrate";
import { DAY_NAMES, formatRange } from "@/lib/roomfinder";
import { slotLabel } from "@/lib/officers";
import { EO_BLOCK_COUNT, EO_COLUMNS, EO_SCHEDULE } from "@/lib/data/officerAvailabilityEo";
import {
  btnAdmin,
  btnGhostAdmin,
  Card,
  Field,
  inputCls,
  Notice,
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
  searchParams: Promise<{
    edit?: string;
    error?: string;
    saved?: string;
    slot?: string;
    loaded?: string;
  }>;
}) {
  await requirePermission("content");
  await ensureSchema();
  const params = await searchParams;
  const [rows, slots] = await Promise.all([
    db.select().from(officers).orderBy(asc(officers.displayOrder)),
    db
      .select()
      .from(officerAvailability)
      .orderBy(asc(officerAvailability.displayOrder), asc(officerAvailability.start)),
  ]);
  const editing = rows.find((o) => o.id === params?.edit) ?? null;
  const editingSlot = slots.find((slot) => slot.id === params?.slot) ?? null;
  const slotOfficer = (officerId: string) =>
    rows.find((o) => o.id === officerId)?.name ?? "Deleted officer";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Officers"
        description="Manage the cabinet: photos, names, positions, portfolios, order and visibility."
      />
      {params?.error && <Warn>{decodeURIComponent(params.error)}</Warn>}
      {params?.saved && <Notice>Saved.</Notice>}
      {params?.loaded && <Notice>{params.loaded}</Notice>}

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

      {/* ------------------------ Availability schedule --------------------- */}
      <Card>
        <h2 className="font-display text-base font-bold text-snow">
          Availability schedule (duty / consultation hours)
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          Publish when each officer can be found — weekly blocks (repeat every
          week) or dated blocks (one-off). Hours appear on the public Officers
          page as the weekly timetable and inside each officer&apos;s card, and an
          officer inside a published block right now is marked
          &ldquo;On duty now&rdquo;. Nothing shows publicly until hours exist here.
        </p>

        <div className="mt-4 rounded-xl border border-vio-600/40 bg-vio-950/25 p-3.5">
          <p className="font-display text-sm font-bold text-snow">
            {EO_SCHEDULE.heading}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-mist">
            {EO_SCHEDULE.title} ({EO_SCHEDULE.term}) is published as one column
            per officer with a block for every &ldquo;No Scheduled Classes&rdquo; slot.
            Loading it fills {EO_BLOCK_COUNT} weekly blocks across{" "}
            {EO_COLUMNS.length} officers, matching each column to the roster by
            position and portfolio. Re-running replaces the blocks it manages,
            so it never duplicates. {EO_SCHEDULE.provenance}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={loadOfficerAvailability} className="inline-flex">
              <button type="submit" className={btnAdmin}>
                Load {EO_SCHEDULE.title} schedule
              </button>
            </form>
            {slots.length > 0 && (
              <form action={clearOfficerAvailability} className="inline-flex">
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-bad/30 bg-bad/10 px-3 text-xs font-semibold text-bad transition-colors duration-200 hover:bg-bad/20 press"
                >
                  Clear all hours
                </button>
              </form>
            )}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] font-semibold text-vio-300">
              Columns in the order
            </summary>
            <ul className="mt-2 grid gap-1 text-[11px] text-mist sm:grid-cols-2">
              {EO_COLUMNS.map((column) => (
                <li key={column.column}>
                  <span className="font-semibold text-snow">{column.column}</span>
                  {" → "}
                  {column.portfolio
                    ? `${column.position} — ${column.portfolio}`
                    : column.position}
                  {" · "}
                  {column.blocks.length} block
                  {column.blocks.length === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <form action={saveOfficerAvailability} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="id" value={editingSlot?.id ?? ""} />
          <Field label="Officer">
            <select
              name="officerId"
              required
              defaultValue={editingSlot?.officerId ?? ""}
              className={inputCls}
            >
              <option value="" disabled>
                Choose an officer…
              </option>
              {rows.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name} — {officer.position}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Repeats">
            <select
              name="kind"
              defaultValue={editingSlot?.kind ?? "weekly"}
              className={inputCls}
            >
              <option value="weekly">Every week (choose a weekday)</option>
              <option value="date">One date only</option>
            </select>
          </Field>
          <Field label="Weekday (for weekly hours)">
            <select name="day" defaultValue={editingSlot?.day ?? ""} className={inputCls}>
              <option value="">—</option>
              {DAY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="…or date (for one-off hours)">
            <input
              type="date"
              name="date"
              defaultValue={editingSlot?.date ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Start time">
            <input
              type="time"
              name="start"
              required
              defaultValue={editingSlot?.start ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="End time">
            <input
              type="time"
              name="end"
              required
              defaultValue={editingSlot?.end ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Location (optional)">
            <input
              name="location"
              defaultValue={editingSlot?.location ?? ""}
              placeholder="LSC Office, Room 204…"
              className={inputCls}
            />
          </Field>
          <Field label="Note (optional)" className="sm:col-span-2">
            <input
              name="note"
              defaultValue={editingSlot?.note ?? ""}
              placeholder="e.g. walk-in concerns, bring your student ID"
              className={inputCls}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
            <button type="submit" className={btnAdmin}>
              {editingSlot ? "Save hours" : "Add hours"}
            </button>
            {editingSlot && (
              <a href="/admin/officers" className={btnGhostAdmin}>
                Cancel edit
              </a>
            )}
          </div>
        </form>

        {slots.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="border-b border-line">
                <tr>
                  <Th>Officer</Th>
                  <Th>When</Th>
                  <Th>Time</Th>
                  <Th>Location</Th>
                  <Th>Note</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <Td className="font-semibold text-snow">
                      {slotOfficer(slot.officerId)}
                    </Td>
                    <Td>
                      {slotLabel({
                        id: slot.id,
                        officerId: slot.officerId,
                        kind: slot.kind === "date" ? "date" : "weekly",
                        day: slot.day,
                        date: slot.date,
                        start: slot.start,
                        end: slot.end,
                        location: slot.location,
                        note: slot.note,
                      })}
                      <span className="ms-2 rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
                        {slot.kind === "date" ? "one-off" : "weekly"}
                      </span>
                    </Td>
                    <Td className="tnum">{formatRange(slot.start, slot.end)}</Td>
                    <Td>{slot.location || "—"}</Td>
                    <Td>{slot.note || "—"}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/admin/officers?slot=${slot.id}`}
                          className={btnGhostAdmin}
                        >
                          Edit
                        </a>
                        <RowAction
                          action={deleteOfficerAvailability}
                          id={slot.id}
                          label="Delete"
                          tone="danger"
                        />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {slots.length === 0 && (
          <p className="mt-4 rounded-xl border border-line bg-night/40 px-4 py-3 text-xs text-mist">
            No hours published yet — the Officers page shows each officer without a
            schedule until you add one.
          </p>
        )}
        {rows.length === 0 && (
          <p className="mt-3 text-xs text-dim">
            Add an officer first, then publish their hours here.
          </p>
        )}
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
