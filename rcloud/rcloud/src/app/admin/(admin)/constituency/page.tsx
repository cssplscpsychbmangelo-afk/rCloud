import { asc } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { requirePermission } from "@/lib/server/auth";
import {
  constituencyPeriods,
  constituencySettings,
} from "@/lib/server/schema";
import {
  refreshConstituency,
  saveConstituencySettings,
} from "@/lib/server/actions";
import { formatNumber } from "@/lib/format";
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

export default async function AdminConstituencyPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; synced?: string; error?: string }>;
}) {
  await requirePermission("constituency");
  const params = await searchParams;

  const [rows, [settings]] = await Promise.all([
    db.select().from(constituencyPeriods).orderBy(asc(constituencyPeriods.position)),
    db.select().from(constituencySettings).limit(1),
  ]);
  const sheetId = settings?.sheetId ?? "";
  const tabErrors = (settings?.tabErrors ?? "").split("\n").filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Constituency"
        description="Constituency Check totals are read automatically from a Google Sheet — one tab per date/date-range. Totals are never entered by hand."
      />

      {params?.saved && <Notice>Google Sheet link saved.</Notice>}
      {params?.synced && <Notice>Constituency data refreshed from the Google Sheet.</Notice>}
      {params?.error === "sheet" && (
        <Warn>Enter a valid Google Sheet link (docs.google.com/spreadsheets/d/…).</Warn>
      )}
      {params?.error === "refresh" && (
        <Warn>{settings?.lastError || "The Google Sheet could not be read. Try again."}</Warn>
      )}

      <Card>
        <h2 className="font-display text-base font-bold text-snow">Google Sheet</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-mist">
          The Sheet must be shared as “Anyone with the link — Viewer”. Each tab
          is one date/date-range (e.g. JULY 6-12). Only the “Total (All
          Sections)” row is read — columns B (Safe), C (Apektado ng Baha) and E
          (Walang Internet). Add a new tab for a new date, then press Refresh —
          no code change is ever needed.
        </p>
        <form action={saveConstituencySettings} className="mt-4 grid gap-4">
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
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-snow">Data</h2>
            <p className="mt-1.5 text-xs text-mist">
              {settings?.lastSyncedAt
                ? `Last updated: ${formatSyncedAt(settings.lastSyncedAt)} · ${settings.tabCount} date${settings.tabCount === 1 ? "" : "s"} synced`
                : "Never refreshed yet."}
            </p>
          </div>
          <form action={refreshConstituency} className="inline-flex">
            <button type="submit" className={btnAdmin} disabled={!sheetId}>
              Refresh data
            </button>
          </form>
        </div>
        {tabErrors.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {tabErrors.map((line) => (
              <Warn key={line}>{line}</Warn>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="border-b border-line">
            <tr>
              <Th>Date / date-range (tab)</Th>
              <Th>Safe</Th>
              <Th>Apektado ng Baha</Th>
              <Th>Walang Internet / Mabagal</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id}>
                <Td className="font-semibold text-snow">{row.label}</Td>
                <Td className="tnum">{formatNumber(row.safe)}</Td>
                <Td className="tnum">{formatNumber(row.baha)}</Td>
                <Td className="tnum">{formatNumber(row.internet)}</Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <Td className="text-dim" >
                  No periods synced yet — save the Sheet link and press Refresh.
                </Td>
                <Td /><Td /><Td />
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
