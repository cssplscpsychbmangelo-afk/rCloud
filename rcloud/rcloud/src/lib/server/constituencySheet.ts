/**
 * Google Sheets reader for the Constituency Check.
 *
 * Flow: Google Form → Google Sheet → rCloud.
 * The Sheet is the source; this module only ever reads the
 * "Total (All Sections)" row of each tab, and only columns B, C and E.
 *
 * Column mapping (fixed by the Sheet layout):
 *   B → Safe
 *   C → Apektado ng Baha
 *   E → Walang Internet / Mabagal ang Internet Connection
 *
 * Everything else in the Sheet (section names, per-section rows, names,
 * emails, student numbers) is never read and never stored.
 */

import { unzipSync } from "fflate";

const SHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const FETCH_TIMEOUT_MS = 20_000;

/** Column letter → the label shown on the public site. */
export const COLUMN_LABELS = {
  B: "Safe",
  C: "Apektado ng Baha",
  E: "Walang Internet / Mabagal ang Internet Connection",
} as const;

export type ConstituencyPeriod = {
  /** The Sheet tab name, used verbatim as the displayed date/date-range. */
  label: string;
  safe: number;
  baha: number;
  internet: number;
  /** Sheet order, newest tabs last. */
  position: number;
};

export type TabFailure = { tab: string; reason: string };

export type ConstituencyFetch =
  | { ok: true; periods: ConstituencyPeriod[]; failures: TabFailure[]; tabs: string[] }
  | { ok: false; reason: string };

/** Accepts either a full Sheet URL or a bare Sheet ID. */
export function parseSheetId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const fromUrl = value.match(SHEET_ID_PATTERN);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(value) ? value : null;
}

/** Human-readable text for the public site when the data cannot be shown. */
export const PUBLIC_UNAVAILABLE =
  "Constituency data is temporarily unavailable. Please check again later.";

/** Translates low-level failures into something an admin can act on. */
function describeAccessError(status: number): string | null {
  if (status === 401 || status === 403) {
    return "Google blocked the request. Set the Sheet to “Anyone with the link — Viewer”, then refresh again.";
  }
  if (status === 404) {
    return "Google could not find that Sheet. Check the link in the configuration above.";
  }
  if (status === 429) {
    return "Google rate-limited the request. Wait a minute and refresh again.";
  }
  return status >= 500
    ? `Google returned an error (HTTP ${status}). Try again shortly.`
    : `Unexpected response from Google (HTTP ${status}).`;
}

async function fetchSheetResponse(url: string, accept: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: accept },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const name = (error as Error)?.name;
    throw new Error(
      name === "TimeoutError" || name === "AbortError"
        ? "Google took too long to respond. Try again shortly."
        : "Could not reach Google Sheets. Check the server's internet access and try again.",
    );
  }
  if (!response.ok) {
    const reason = describeAccessError(response.status);
    if (reason) throw new Error(reason);
    throw new Error(`Google Sheets responded with HTTP ${response.status}.`);
  }
  return response;
}

async function getSheetText(url: string, accept: string): Promise<string> {
  return (await fetchSheetResponse(url, accept)).text();
}

async function getSheetBuffer(url: string): Promise<ArrayBuffer> {
  const accept = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return (await fetchSheetResponse(url, accept)).arrayBuffer();
}

/* ------------------------------- tab listing ------------------------------ */

/**
 * Lists every tab (worksheet) in the workbook, in Sheet order.
 * New tabs appear here automatically — no code change is ever needed.
 *
 * The tab names come from `xl/workbook.xml` inside the workbook export, which
 * is the canonical source and needs no API key.
 */
export async function listSheetTabs(sheetId: string): Promise<string[]> {
  const buffer = await getSheetBuffer(
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`,
  );
  const names = readWorkbookSheetNames(buffer);
  if (names.length === 0) {
    throw new Error(
      "That Sheet has no readable tabs. Confirm it is a Google Sheet and contains at least one tab.",
    );
  }
  return names;
}

/**
 * Reads the visible sheet names out of the exported workbook archive.
 * Returns an empty list when the layout is unexpected, which the caller
 * reports as an understandable admin-side error.
 */
function readWorkbookSheetNames(buffer: ArrayBuffer): string[] {
  let xml: string;
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const entry = files["xl/workbook.xml"];
    if (!entry) return [];
    xml = new TextDecoder().decode(entry);
  } catch {
    return [];
  }

  const start = xml.indexOf("<sheets>");
  const end = xml.indexOf("</sheets>", start);
  if (start === -1 || end === -1) return [];

  const names: string[] = [];
  for (const match of xml.slice(start, end).matchAll(/<sheet\b[^>]*\/?>/g)) {
    const tag = match[0];
    if (/state="(?!visible")/.test(tag)) continue;
    const name = tag.match(/name="([^"]*)"/)?.[1];
    if (name) names.push(decodeXmlEntities(name).trim());
  }
  return names.filter(Boolean);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/* ------------------------------ CSV reading ------------------------------- */

/** Minimal RFC 4180 parser — quoted fields, escaped quotes, CRLF safe. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const TOTAL_ROW_PATTERN = /^\s*total\s*\(\s*all\s+sections\s*\)\s*$/i;

/** Reads only the Total (All Sections) row — columns B, C and E. */
export function readTotalsFromCsv(csv: string): {
  safe: number;
  baha: number;
  internet: number;
} | null {
  const rows = parseCsv(csv);
  const totalRow = rows.find((cells) => TOTAL_ROW_PATTERN.test(cells[0] ?? ""));
  if (!totalRow) return null;
  const safe = toTotal(totalRow[1]);
  const baha = toTotal(totalRow[2]);
  const internet = toTotal(totalRow[4]);
  if (safe === null || baha === null || internet === null) return null;
  return { safe, baha, internet };
}

/** Accepts "1,015", "1015", " 1015 " and treats a blank cell as 0. */
function toTotal(raw: string | undefined): number | null {
  const cell = (raw ?? "").replace(/[,\s]/g, "");
  if (cell === "") return 0;
  const value = Number(cell);
  return Number.isFinite(value) ? value : null;
}

/* --------------------------------- reader --------------------------------- */

/**
 * Reads every tab's Total (All Sections) row. Tabs that are missing the row or
 * a required column are reported back so the admin panel can explain them —
 * the public site never sees a technical error.
 */
export async function readConstituencySheet(
  sheetId: string,
): Promise<ConstituencyFetch> {
  let tabs: string[];
  try {
    tabs = await listSheetTabs(sheetId);
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }

  const periods: ConstituencyPeriod[] = [];
  const failures: TabFailure[] = [];

  for (const [index, tab] of tabs.entries()) {
    let csv: string;
    try {
      csv = await getSheetText(
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`,
        "text/csv",
      );
    } catch (error) {
      failures.push({ tab, reason: (error as Error).message });
      continue;
    }
    const totals = readTotalsFromCsv(csv);
    if (!totals) {
      failures.push({
        tab,
        reason:
          "No readable “Total (All Sections)” row, or columns B, C or E are not numbers in that row.",
      });
      continue;
    }
    periods.push({ label: tab, position: index, ...totals });
  }

  if (periods.length === 0) {
    return {
      ok: false,
      reason: failures.length
        ? `No tab could be read. ${failures[0].tab}: ${failures[0].reason}`
        : "The Sheet has no readable tabs.",
    };
  }
  return { ok: true, periods, failures, tabs };
}
