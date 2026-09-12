/**
 * Constituency Check report endpoint — POST /api/constituency/report
 *
 * Body: { period, name?, section? }
 *  - period  the Google Sheet tab (date / date-range) selected by the user
 *  - name    optional, entered by the student
 *  - section optional, entered by the student
 *
 * Returns the fixed-template PDF as a downloadable attachment.
 *
 * Data flow: the selected tab's "Total (All Sections)" row is read from the
 * Google Sheet (columns B, C and E). If the Sheet cannot be reached at that
 * moment, the last synced values for that tab are used instead, so a report can
 * still be produced. Only the three approved totals are ever read — never
 * individual responses, names, sections or contact details.
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  constituencyPeriods,
  constituencySettings,
} from "@/lib/server/schema";
import { readConstituencyTab } from "@/lib/server/constituencySheet";
import {
  buildReportFilename,
  formatReportPeriod,
  renderConstituencyReport,
} from "@/lib/server/constituencyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGO_PUBLIC_PATH = "/brand/cssp-lsc-logo.png";
const MAX_NAME = 120;
const MAX_SECTION = 60;

type Payload = { period: string; name: string; section: string };

function clean(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

/**
 * Loads the official CSSP LSC logo.
 *
 * The logo lives in `public/brand/`, which is served over HTTP on every host
 * (including serverless ones, where it is not part of the server bundle), so it
 * is fetched from the app's own origin and cached for the lifetime of the
 * process. The asset is never re-created or substituted.
 */
let logoCache: Promise<Uint8Array | null> | null = null;

async function loadLogoPng(origin: string): Promise<Uint8Array | null> {
  logoCache ??= (async () => {
    try {
      const response = await fetch(new URL(LOGO_PUBLIC_PATH, origin), {
        cache: "no-store",
      });
      if (!response.ok) return null;
      return new Uint8Array(await response.arrayBuffer());
    } catch {
      return null;
    }
  })();
  const bytes = await logoCache;
  // Never cache a failure — the next report can try again.
  if (!bytes) logoCache = null;
  return bytes;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    payload = {
      period: clean(body?.period, 200),
      name: clean(body?.name, MAX_NAME),
      section: clean(body?.section, MAX_SECTION),
    };
  } catch {
    return NextResponse.json(
      { error: "The report request could not be read. Please try again." },
      { status: 400 },
    );
  }

  if (!payload.period) {
    return NextResponse.json(
      { error: "Select a report period first." },
      { status: 400 },
    );
  }

  const [rows, settingsRows] = await Promise.all([
    db
      .select()
      .from(constituencyPeriods)
      .where(eq(constituencyPeriods.label, payload.period))
      .limit(1),
    db.select().from(constituencySettings).limit(1),
  ]);

  const stored = rows[0];
  if (!stored) {
    return NextResponse.json(
      {
        error:
          "That report period is no longer available. Refresh the page and try again.",
      },
      { status: 404 },
    );
  }

  // Read the selected tab straight from the Google Sheet; fall back to the
  // last synced figures if the Sheet is unreachable at this moment.
  let figures = {
    safe: stored.safe,
    baha: stored.baha,
    internet: stored.internet,
  };
  let dataUpdatedAt =
    stored.syncedAt ?? settingsRows[0]?.lastSyncedAt ?? new Date();
  const sheetId = settingsRows[0]?.sheetId;
  if (sheetId) {
    const live = await readConstituencyTab(sheetId, stored.label);
    if (live) {
      figures = live;
      dataUpdatedAt = new Date();
    }
  }

  const generatedAt = new Date();
  const reportPeriod = formatReportPeriod(stored.label, dataUpdatedAt);

  let logoPng: Uint8Array | null = null;
  try {
    logoPng = await loadLogoPng(new URL(request.url).origin);
  } catch {
    logoPng = null;
  }
  if (!logoPng) {
    return NextResponse.json(
      {
        error:
          "The report template could not be prepared. Please try again in a moment.",
      },
      { status: 500 },
    );
  }

  let pdf: Uint8Array;
  try {
    pdf = await renderConstituencyReport({
      periodLabel: stored.label,
      reportPeriod,
      figures,
      studentName: payload.name,
      studentSection: payload.section,
      dataUpdatedAt,
      generatedAt,
      logoPng,
    });
  } catch (error) {
    console.error("[constituency-report] failed to render PDF", error);
    return NextResponse.json(
      { error: "The PDF report could not be generated. Please try again." },
      { status: 500 },
    );
  }

  const filename = buildReportFilename(reportPeriod);
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "no-store, max-age=0",
      // Lets the page use the exact filename for the download attribute.
      "X-Report-Filename": filename,
    },
  });
}
