import { asc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import {
  roomfinderEntries,
  roomfinderSettings,
} from "@/lib/server/schema";
import {
  refreshRoomfinder,
  saveRoomfinderSettings,
  uploadRoomfinderFile,
  clearRoomfinderData,
} from "@/lib/server/actions";
import {
  btnAdmin,
  Card,
  Field,
  inputCls,
  Notice,
  PageHeader,
  Td,
  Th,
  Warn,
} from "@/components/admin/Ui";
import { ensureSchema } from "@/lib/server/migrate";

export const dynamic = "force-dynamic";

const SHEET_URL = (sheetId: string) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

function formatSyncedAt(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminRoomfinderPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; synced?: string; cleared?: string; error?: string }>;
}) {
  await requirePermission("roomfinder");
  await ensureSchema();
  const params = await searchParams;

  const [rows, [settings]] = await Promise.all([
    db.select().from(roomfinderEntries).orderBy(asc(roomfinderEntries.room), asc(roomfinderEntries.day), asc(roomfinderEntries.start)).limit(200),
    db.select().from(roomfinderSettings).limit(1),
  ]);

  const totalCount = settings?.entryCount ?? rows.length;
  const sheetId = settings?.sheetId ?? "";
  const tabErrors = (settings?.tabErrors ?? "").split("\n").filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roomivility — Room Schedule"
        description="Upload a Google Sheet where each tab is a Room No. (e.g. 201, 202, 301). Inside each tab, put Day, Start, End, Course, Section columns. The site auto-detects rooms from tab names. Placeholders (public/data/cssp-schedule.json) stay until you sync a sheet."
      />

      {params?.saved && <Notice>Google Sheet link saved.</Notice>}
      {params?.synced && <Notice>Room schedule refreshed — {totalCount} entries synced from {settings?.tabCount ?? 0} room tabs.</Notice>}
      {params?.cleared && <Notice>Custom room data cleared — placeholders will be used again.</Notice>}
      {params?.error === "sheet" && (
        <Warn>Enter a valid Google Sheet link (docs.google.com/spreadsheets/d/…).</Warn>
      )}
      {params?.error === "refresh" && (
        <Warn>{settings?.lastError || "The Google Sheet could not be read. Try again."}</Warn>
      )}
      {params?.error === "file" && <Warn>Please choose a file to upload.</Warn>}
      {params?.error === "large" && <Warn>File too large — keep it under 5 MB.</Warn>}
      {params?.error === "type" && <Warn>Unsupported file type. Upload .xlsx, .csv or .json.</Warn>}
      {params?.error === "parse" && (
        <Warn>{settings?.lastError || "Could not parse the uploaded file. Check the format and try again."}</Warn>
      )}
      {params?.error === "empty" && <Warn>No valid schedule entries found in the file.</Warn>}

      <Card>
        <h2 className="font-display text-base font-bold text-snow">Option 1 — Google Sheet link (recommended)</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          Create a Google Sheet. Make each tab a Room No. — the tab name is the room number (e.g. “201”, “Room 201”, “301”). In each tab, first row should be headers: <span className="font-semibold text-snow">Day | Start | End | Course | Section | Instructor | Building</span>. Example row: <span className="font-mono text-[11px]">Monday | 08:00 | 09:30 | PSY 101 | BSP 1A | Prof. Cruz | CSSP</span>. The Sheet must be shared as “Anyone with the link — Viewer”. The site automatically detects room numbers from tab names.
        </p>
        <div className="mt-3 rounded-xl border border-line bg-night/40 p-3 text-[11px] leading-relaxed text-dim">
          <p className="font-bold text-mist">Template guide:</p>
          <ul className="mt-1 list-disc space-y-1 ps-4">
            <li><span className="text-mist">Day</span> — Monday, Tuesday, etc. Also accepts Mon, Tue, etc.</li>
            <li><span className="text-mist">Start / End</span> — 08:00, 8:00 AM, 13:30, 1:30 PM. Normalized to 24h automatically.</li>
            <li><span className="text-mist">Course</span> — e.g. PSY 101, SOC 1 (optional but recommended)</li>
            <li><span className="text-mist">Section</span> — e.g. BSP 1A (optional)</li>
            <li><span className="text-mist">Instructor / Building</span> — optional, shown only if provided</li>
            <li>Leave blank rows empty — they are skipped. Invalid Day/Start/End rows are reported below.</li>
          </ul>
        </div>
        <form action={saveRoomfinderSettings} className="mt-4 grid gap-4">
          <Field label="Google Sheet link">
            <input
              name="sheetUrl"
              required
              defaultValue={sheetId ? SHEET_URL(sheetId) : ""}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className={inputCls}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={btnAdmin}>
              Save Sheet link
            </button>
            {sheetId && (
              <a
                href={SHEET_URL(sheetId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-xl border border-line bg-panel px-4 py-2 text-xs font-semibold text-mist transition-colors duration-200 hover:text-snow"
              >
                Open Sheet
              </a>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-base font-bold text-snow">Option 2 — Upload .xlsx / .csv / .json</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          Upload an Excel file where each tab is a Room No. — same format as the Google Sheet. Or upload a JSON file matching <span className="font-mono text-[11px]">public/data/cssp-schedule.json</span> structure. Max 5 MB for Netlify free-tier friendliness.
        </p>
        <form action={uploadRoomfinderFile} className="mt-4 grid gap-4" encType="multipart/form-data">
          <Field label="Excel / CSV / JSON file">
            <input
              type="file"
              name="file"
              accept=".xlsx,.csv,.json"
              required
              className="block w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-xs text-mist file:mr-3 file:rounded-lg file:border file:border-line file:bg-night file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-snow hover:file:bg-panel-2"
            />
          </Field>
          <Field label="If CSV, room name (optional — defaults to filename)">
            <input name="room" placeholder="e.g. 201" className={inputCls} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={btnAdmin}>
              Upload &amp; Sync
            </button>
            <span className="text-[11px] text-dim">.xlsx tabs = room numbers, auto-detected</span>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-snow">Live data</h2>
            <p className="mt-1.5 text-xs text-mist">
              {settings?.lastSyncedAt
                ? `Last synced: ${formatSyncedAt(settings.lastSyncedAt)} · ${settings.tabCount} room${settings.tabCount === 1 ? "" : "s"} · ${settings.entryCount} entries`
                : "Never synced yet — placeholders from /data/cssp-schedule.json are being used."}
            </p>
            {!settings?.lastSyncedAt && (
              <p className="mt-1 text-[11px] text-dim">
                Placeholders stay active until you sync a Sheet or upload a file. The Room Finder works offline once loaded.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={refreshRoomfinder} className="inline-flex">
              <button type="submit" className={btnAdmin} disabled={!sheetId}>
                Refresh from Sheet
              </button>
            </form>
            <form action={clearRoomfinderData} className="inline-flex">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center rounded-xl border border-bad/30 bg-bad/10 px-4 py-2 text-xs font-semibold text-bad transition-colors duration-200 hover:border-bad/60 hover:bg-bad/20"
              >
                Clear &amp; use placeholders
              </button>
            </form>
          </div>
        </div>
        {tabErrors.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {tabErrors.map((line, idx) => (
              <Warn key={`${idx}-${line}`}>{line}</Warn>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-dim">Preview — first 200 entries (DB)</h3>
          <span className="text-[11px] text-dim">{totalCount} total entries</span>
        </div>
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>Room (tab)</Th>
              <Th>Day</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>Course</Th>
              <Th>Section</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id}>
                <Td className="font-semibold text-snow">{row.room}</Td>
                <Td>{row.day}</Td>
                <Td className="tnum">{row.start}</Td>
                <Td className="tnum">{row.end}</Td>
                <Td>{row.course ?? "—"}</Td>
                <Td className="text-vio-300">{row.section ?? "—"}</Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td className="text-dim">No custom entries yet — placeholders from static JSON are active. Sync a Sheet or upload .xlsx to see data here.</Td>
                <Td /><Td /><Td /><Td /><Td />
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
