/**
 * Google Sheets + XLSX reader for Roomivility (Room Finder).
 *
 * Flow: Google Sheet (or uploaded XLSX) → rCloud DB → public API.
 * Each tab = Room No. (e.g. "201", "Room 201").
 * Each row inside a tab = one scheduled class.
 *
 * Expected columns (flexible header detection):
 *   Day | Start | End | Course | Section | Instructor | Building
 *
 * - Day: Monday, Tuesday, etc. (also Mon, MON, etc.)
 * - Start/End: 08:00, 8:00 AM, 13:30, etc. Normalized to HH:MM 24h.
 * - Course/Section/Instructor/Building: optional, kept verbatim.
 *
 * Placeholders (public/data/cssp-schedule.json) are only used while the
 * council has no schedule of its own. The moment a Sheet is synced or a file
 * is uploaded, getRoomfinderSource() reports custom data and the client drops
 * the placeholder — the DB being empty after that shows an honest empty state
 * instead of sample rooms.
 */

import { unzipSync } from "fflate";

const SHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const FETCH_TIMEOUT_MS = 20_000;

export type RoomScheduleEntry = {
  room: string;
  day: string;
  start: string; // HH:MM 24h
  end: string;   // HH:MM 24h
  course?: string;
  section?: string;
  instructor?: string;
  building?: string;
};

export type TabFailure = { tab: string; reason: string };

export type RoomfinderFetch =
  | { ok: true; entries: RoomScheduleEntry[]; failures: TabFailure[]; tabs: string[] }
  | { ok: false; reason: string };

export function parseSheetId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const fromUrl = value.match(SHEET_ID_PATTERN);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(value) ? value : null;
}

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

/* ------------------------------ Day / Time ------------------------------- */

const DAY_ALIASES: Record<string, string> = {
  monday: "Monday",
  mon: "Monday",
  m: "Monday",
  tuesday: "Tuesday",
  tue: "Tuesday",
  tues: "Tuesday",
  t: "Tuesday",
  wednesday: "Wednesday",
  wed: "Wednesday",
  w: "Wednesday",
  thursday: "Thursday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  th: "Thursday",
  friday: "Friday",
  fri: "Friday",
  f: "Friday",
  saturday: "Saturday",
  sat: "Saturday",
  sa: "Saturday",
  sunday: "Sunday",
  sun: "Sunday",
  su: "Sunday",
};

export function normalizeDay(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (DAY_ALIASES[key]) return DAY_ALIASES[key];
  // Allow "Monday" etc direct
  const cap = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  const known = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  if (known.includes(cap)) return cap;
  // Try prefix match
  for (const full of known) {
    if (full.toLowerCase().startsWith(key)) return full;
  }
  return null;
}

/**
 * Parses various time formats into HH:MM 24h.
 * Accepts:
 *  - "08:00", "8:00", "8", "8:30"
 *  - "8:00 AM", "8:00AM", "8 AM", "8PM"
 *  - "13:00"
 *  - Excel fractional day numbers (e.g. 0.333333 = 08:00) as number or string
 */
export function parseTimeToHHMM(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Excel fractional day: e.g. 0.5 = 12:00, 0.333... = 08:00
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && trimmed !== "" && !trimmed.includes(":") && asNumber >= 0 && asNumber < 1) {
    const totalMinutes = Math.round(asNumber * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Normalize: remove spaces around colon, uppercase AM/PM
  const lower = trimmed.toLowerCase().replace(/\s+/g, " ").trim();

  // Extract AM/PM if present
  const ampmMatch = lower.match(/\b(am|pm)\b/);
  const ampm = ampmMatch ? ampmMatch[1] : null;
  const timePart = lower.replace(/\b(am|pm)\b/g, "").trim();

  // Match HH:MM or HH
  const match = timePart.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) {
    // Try HH:MM with optional seconds ignored
    const match2 = timePart.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
    if (!match2) return null;
    let h = Number(match2[1]);
    let m = Number(match2[2]);
    if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) return null;
    if (ampm) {
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  let h = Number(match[1]);
  let m = match[2] ? Number(match[2]) : 0;
  if (Number.isNaN(h) || Number.isNaN(m) || m > 59) return null;
  if (h > 23) {
    // If 12h format with h=12 and ampm, handle
    if (h === 12 && ampm) {
      // ok
    } else {
      return null;
    }
  }

  if (ampm) {
    if (h > 12) return null;
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  }

  if (h < 0 || h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/* ------------------------------ Row parsing ------------------------------- */

type ColumnIndices = {
  day: number;
  start: number;
  end: number;
  course: number | null;
  section: number | null;
  instructor: number | null;
  building: number | null;
};

function detectColumns(header: string[]): ColumnIndices | null {
  const lower = header.map((h) => h.toLowerCase().trim());
  const find = (keywords: string[]) => {
    for (let i = 0; i < lower.length; i++) {
      const cell = lower[i];
      if (!cell) continue;
      for (const kw of keywords) {
        if (cell.includes(kw)) return i;
      }
    }
    return -1;
  };

  const dayIdx = find(["day"]);
  const startIdx = find(["start", "from", "begin"]);
  const endIdx = find(["end", "to", "until", "finish"]);

  // If we can't find the three required, return null to trigger positional fallback
  if (dayIdx === -1 || startIdx === -1 || endIdx === -1) return null;

  const courseIdx = find(["course", "subject", "class", "title"]);
  const sectionIdx = find(["section", "sec", "group", "class section"]);
  const instructorIdx = find(["instructor", "prof", "teacher", "faculty"]);
  const buildingIdx = find(["building", "bldg", "location", "bld", "area"]);

  return {
    day: dayIdx,
    start: startIdx,
    end: endIdx,
    course: courseIdx === -1 ? null : courseIdx,
    section: sectionIdx === -1 ? null : sectionIdx,
    instructor: instructorIdx === -1 ? null : instructorIdx,
    building: buildingIdx === -1 ? null : buildingIdx,
  };
}

function positionalColumns(): ColumnIndices {
  return { day: 0, start: 1, end: 2, course: 3, section: 4, instructor: 5, building: 6 };
}

export function readEntriesFromRows(
  rows: string[][],
  roomLabel: string,
): { entries: RoomScheduleEntry[]; invalid: number } {
  if (rows.length === 0) return { entries: [], invalid: 0 };

  // Detect header
  const first = rows[0].map((c) => c.trim());
  const looksLikeHeader =
    first.some((c) => /day/i.test(c)) ||
    first.some((c) => /start|from/i.test(c)) ||
    first.some((c) => /course|subject/i.test(c));

  let colIdx: ColumnIndices;
  let dataRows: string[][];

  if (looksLikeHeader) {
    const detected = detectColumns(first);
    colIdx = detected ?? positionalColumns();
    dataRows = rows.slice(1);
  } else {
    colIdx = positionalColumns();
    dataRows = rows;
  }

  const entries: RoomScheduleEntry[] = [];
  let invalid = 0;

  for (const row of dataRows) {
    if (row.every((c) => !c.trim())) continue; // skip empty rows

    const dayRaw = row[colIdx.day] ?? "";
    const startRaw = row[colIdx.start] ?? "";
    const endRaw = row[colIdx.end] ?? "";

    const day = normalizeDay(dayRaw);
    const start = parseTimeToHHMM(startRaw);
    const end = parseTimeToHHMM(endRaw);

    if (!day || !start || !end) {
      invalid++;
      continue;
    }

    const sMin = toMinutes(start);
    const eMin = toMinutes(end);
    if (sMin === null || eMin === null || sMin >= eMin) {
      invalid++;
      continue;
    }

    const course = colIdx.course !== null ? (row[colIdx.course] ?? "").trim() : "";
    const section = colIdx.section !== null ? (row[colIdx.section] ?? "").trim() : "";
    const instructor = colIdx.instructor !== null ? (row[colIdx.instructor] ?? "").trim() : "";
    const building = colIdx.building !== null ? (row[colIdx.building] ?? "").trim() : "";

    const entry: RoomScheduleEntry = {
      room: roomLabel.trim(),
      day,
      start,
      end,
    };
    if (course) entry.course = course;
    if (section) entry.section = section;
    if (instructor) entry.instructor = instructor;
    if (building) entry.building = building;

    entries.push(entry);
  }

  return { entries, invalid };
}

export function readEntriesFromCsv(
  csv: string,
  roomLabel: string,
): { entries: RoomScheduleEntry[]; invalid: number } {
  const rows = parseCsv(csv);
  return readEntriesFromRows(rows, roomLabel);
}

/* ------------------------------ XLSX file upload parsing ------------------------------- */

type XlsxSheetInfo = { name: string; file: string };

function parseWorkbookAndRels(buffer: ArrayBuffer): XlsxSheetInfo[] | null {
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const wbXml = files["xl/workbook.xml"];
    const relsXml = files["xl/_rels/workbook.xml.rels"];
    if (!wbXml || !relsXml) return null;

    const wbText = new TextDecoder().decode(wbXml);
    const relsText = new TextDecoder().decode(relsXml);

    // Map rId -> Target
    const relMap = new Map<string, string>();
    for (const m of relsText.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*>/g)) {
      relMap.set(m[1], m[2]);
    }

    const sheets: XlsxSheetInfo[] = [];
    const sheetsBlockStart = wbText.indexOf("<sheets>");
    const sheetsBlockEnd = wbText.indexOf("</sheets>", sheetsBlockStart);
    if (sheetsBlockStart === -1 || sheetsBlockEnd === -1) return null;
    const block = wbText.slice(sheetsBlockStart, sheetsBlockEnd);

    for (const m of block.matchAll(/<sheet\b[^>]*>/g)) {
      const tag = m[0];
      if (/state="(?!visible")/.test(tag)) continue;
      const name = tag.match(/name="([^"]*)"/)?.[1];
      const rId = tag.match(/r:id="([^"]*)"/)?.[1] ?? tag.match(/id="([^"]*)"/)?.[1];
      if (!name || !rId) continue;
      const target = relMap.get(rId);
      if (!target) continue;
      // target like "worksheets/sheet1.xml"
      sheets.push({ name: decodeXmlEntities(name).trim(), file: `xl/${target}` });
    }

    return sheets.filter((s) => s.name);
  } catch {
    return null;
  }
}

function parseSharedStrings(buffer: ArrayBuffer): string[] {
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const ss = files["xl/sharedStrings.xml"];
    if (!ss) return [];
    const text = new TextDecoder().decode(ss);
    const strings: string[] = [];
    // Each <si> contains one or more <t>
    for (const siMatch of text.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      const si = siMatch[1];
      let combined = "";
      for (const tMatch of si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) {
        combined += decodeXmlEntities(tMatch[1]);
      }
      strings.push(combined);
    }
    return strings;
  } catch {
    return [];
  }
}

function columnLetterToIndex(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1; // A=0
}

function parseWorksheetRows(xmlBuffer: Uint8Array, sharedStrings: string[]): string[][] {
  const text = new TextDecoder().decode(xmlBuffer);
  const rows: string[][] = [];

  // Find sheetData block
  const sheetDataStart = text.indexOf("<sheetData>");
  const sheetDataEnd = text.indexOf("</sheetData>", sheetDataStart);
  if (sheetDataStart === -1 || sheetDataEnd === -1) return rows;
  const data = text.slice(sheetDataStart, sheetDataEnd);

  // Each <row ...>...</row>
  for (const rowMatch of data.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowXml = rowMatch[1];
    const cells: { col: number; value: string }[] = [];

    for (const cellMatch of rowXml.matchAll(/<c[^>]*>([\s\S]*?)<\/c>/g)) {
      const fullCellTag = cellMatch[0];
      const inner = cellMatch[1];

      // r="A1"
      const rAttr = fullCellTag.match(/r="([A-Z]+)\d+"/)?.[1];
      if (!rAttr) continue;
      const colIdx = columnLetterToIndex(rAttr);

      // t="s" => shared string
      const tAttr = fullCellTag.match(/t="([^"]+)"/)?.[1];

      let value = "";
      if (tAttr === "s") {
        const vMatch = inner.match(/<v>([^<]*)<\/v>/);
        if (vMatch) {
          const idx = Number(vMatch[1]);
          if (!Number.isNaN(idx) && sharedStrings[idx] !== undefined) {
            value = sharedStrings[idx];
          }
        }
      } else if (tAttr === "inlineStr") {
        const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        if (tMatch) value = decodeXmlEntities(tMatch[1]);
      } else {
        const vMatch = inner.match(/<v>([^<]*)<\/v>/);
        if (vMatch) {
          value = decodeXmlEntities(vMatch[1]);
        } else {
          const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
          if (tMatch) value = decodeXmlEntities(tMatch[1]);
        }
      }

      cells.push({ col: colIdx, value });
    }

    // Sort by col and build row array
    cells.sort((a, b) => a.col - b.col);
    if (cells.length === 0) {
      rows.push([]);
      continue;
    }
    const maxCol = cells[cells.length - 1].col;
    const rowArr: string[] = Array(maxCol + 1).fill("");
    for (const c of cells) {
      rowArr[c.col] = c.value;
    }
    rows.push(rowArr);
  }

  return rows;
}

export function parseXlsxBuffer(buffer: ArrayBuffer): {
  sheets: { name: string; rows: string[][] }[];
  error?: string;
} {
  const sheetInfos = parseWorkbookAndRels(buffer);
  if (!sheetInfos || sheetInfos.length === 0) {
    return { sheets: [], error: "Could not read sheet names from the workbook. Make sure it is a valid .xlsx file." };
  }

  const sharedStrings = parseSharedStrings(buffer);

  try {
    const files = unzipSync(new Uint8Array(buffer));
    const result: { name: string; rows: string[][] }[] = [];

    for (const info of sheetInfos) {
      const fileData = files[info.file];
      if (!fileData) continue;
      const rows = parseWorksheetRows(fileData, sharedStrings);
      result.push({ name: info.name, rows });
    }

    return { sheets: result };
  } catch {
    return { sheets: [], error: "Failed to parse the .xlsx file. Try exporting it again or use the Google Sheet link method." };
  }
}

export function extractEntriesFromXlsx(buffer: ArrayBuffer): {
  entries: RoomScheduleEntry[];
  failures: TabFailure[];
  tabs: string[];
} {
  const parsed = parseXlsxBuffer(buffer);
  if (parsed.error) {
    return { entries: [], failures: [{ tab: "Workbook", reason: parsed.error }], tabs: [] };
  }

  const allEntries: RoomScheduleEntry[] = [];
  const failures: TabFailure[] = [];
  const tabs: string[] = [];

  for (const sheet of parsed.sheets) {
    const roomLabel = sheet.name.trim();
    if (!roomLabel) continue;
    tabs.push(roomLabel);

    const { entries, invalid } = readEntriesFromRows(sheet.rows, roomLabel);
    if (entries.length === 0) {
      failures.push({
        tab: roomLabel,
        reason:
          invalid > 0
            ? `No valid rows found (${invalid} rows skipped). Expected columns: Day, Start, End, Course, Section.`
            : "No readable schedule rows found. Add at least Day, Start, End columns.",
      });
      continue;
    }
    allEntries.push(...entries);
    if (invalid > 0) {
      failures.push({
        tab: roomLabel,
        reason: `${invalid} row(s) skipped due to missing Day/Start/End or invalid time.`,
      });
    }
  }

  return { entries: allEntries, failures, tabs };
}

/* --------------------------------- reader --------------------------------- */

export async function readRoomfinderSheet(sheetId: string): Promise<RoomfinderFetch> {
  let tabs: string[];
  try {
    tabs = await listSheetTabs(sheetId);
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }

  const allEntries: RoomScheduleEntry[] = [];
  const failures: TabFailure[] = [];

  for (const tab of tabs) {
    const roomLabel = tab.trim();
    if (!roomLabel) continue;

    let csv: string;
    try {
      csv = await getSheetText(
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`,
        "text/csv",
      );
    } catch (error) {
      failures.push({ tab: roomLabel, reason: (error as Error).message });
      continue;
    }

    const { entries, invalid } = readEntriesFromCsv(csv, roomLabel);

    if (entries.length === 0) {
      failures.push({
        tab: roomLabel,
        reason:
          invalid > 0
            ? `No valid rows found (${invalid} rows skipped). Expected columns: Day, Start, End, Course, Section.`
            : "No readable schedule rows found in this tab.",
      });
      continue;
    }

    allEntries.push(...entries);

    if (invalid > 0) {
      failures.push({
        tab: roomLabel,
        reason: `${invalid} row(s) in “${roomLabel}” were skipped due to missing Day/Start/End or invalid time.`,
      });
    }
  }

  if (allEntries.length === 0) {
    return {
      ok: false,
      reason: failures.length
        ? `No room schedule could be read. ${failures[0].tab}: ${failures[0].reason}`
        : "The Sheet has no readable room tabs.",
    };
  }

  return { ok: true, entries: allEntries, failures, tabs };
}
