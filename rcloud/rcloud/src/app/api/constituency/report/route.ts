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
import { clientIpFrom, take } from "@/lib/security/rateLimit";
import { db } from "@/lib/server/db";
import {
  constituencyPeriods,
  constituencySettings,
} from "@/lib/server/schema";
import { readConstituencyTab } from "@/lib/server/constituencySheet";
import { loadReportLogo } from "@/lib/server/reportLogo";
import {
  buildReportFilename,
  formatReportPeriod,
  renderConstituencyReport,
} from "@/lib/server/constituencyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME = 120;
const MAX_SECTION = 60;

/**
 * This is the most expensive request rCloud serves (a PDF is rendered from
 * scratch, with a logo and figures read from the sheet), so it is rate limited:
 * a normal student downloads a handful of reports, a script gets cut off.
 */
const REPORT_LIMIT = { limit: 15, windowMs: 10 * 60_000, blockMs: 10 * 60_000 };

/** Reject oversized bodies before parsing — the payload is two short strings. */
const MAX_BODY_BYTES = 4_096;

type Payload = { period: string; name: string; section: string };

function clean(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "That request was too large." }, { status: 413 });
  }

  const limit = take(`report:${clientIpFrom(request.headers)}`, REPORT_LIMIT);
  if (limit.blocked) {
    return NextResponse.json(
      {
        error:
          "Too many reports requested in a short time. Please wait a few minutes and try again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

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
    logoPng = await loadReportLogo(new URL(request.url).origin);
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
