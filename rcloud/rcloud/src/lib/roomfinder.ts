/**
 * CSSP Room Finder — data model and pure helpers.
 *
 * The schedule is a small static JSON file (public/data/cssp-schedule.json).
 * After it is fetched once, EVERY lookup below runs in the student's browser:
 * search, filtering, sorting, room status and availability are all computed
 * locally. There is no database, no per-search request and no tracking.
 *
 * IMPORTANT: nothing here invents schedule data. Statuses are derived only
 * from what the dataset actually contains — "available" always means "no
 * scheduled class in the published schedule", never a promise of physical
 * vacancy.
 */

export interface ScheduleMeta {
  /** Administrator-controlled "SCHEDULE UPDATED" date (YYYY-MM-DD or similar). */
  updated?: string;
  /** Administrator-controlled source label shown as "SOURCE". */
  source?: string;
  /** Optional term label (e.g. "1st Semester, AY 2026–2027"). */
  term?: string;
  /** True while the file is placeholder data, not the official schedule. */
  sample?: boolean;
  /** Administrator flag: schedule may have changed — verify with the office. */
  stale?: boolean;
  /** Optional building/area label, only if the source data defines one. */
  building?: string;
}

export interface ScheduleEntry {
  day: string;
  /** 24-hour "HH:MM" (validated before use). */
  start: string;
  end: string;
  /** Optional — shown only when the source data provides it. */
  course?: string;
  section?: string;
  room: string;
  /** Only present if the official source provides it. */
  instructor?: string;
  /** Only present if the official source provides it. */
  building?: string;
}

export interface ScheduleDataset {
  meta: ScheduleMeta;
  entries: ScheduleEntry[];
}

/** The three published states. Available = "no class found at that time". */
export type RoomStatus = "occupied" | "available" | "none";

export interface RoomAtTime {
  room: string;
  status: RoomStatus;
  /** Class covering the selected time, when occupied. */
  current: ScheduleEntry | null;
  /** Next class after the selected time, when not occupied. */
  next: ScheduleEntry | null;
}

export type TimelineKind = "class" | "free";

export interface TimelineBlock {
  kind: TimelineKind;
  start: ScheduleEntry | null;
  end: ScheduleEntry | null;
  entry: ScheduleEntry | null;
}

/* ------------------------------------------------------------------ */
/* Day helpers                                                         */
/* ------------------------------------------------------------------ */

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DAY_SHORT: Record<string, string> = {
  Monday: "MON",
  Tuesday: "TUE",
  Wednesday: "WED",
  Thursday: "THU",
  Friday: "FRI",
  Saturday: "SAT",
  Sunday: "SUN",
};

export function dayIndex(day: string): number {
  const i = DAY_NAMES.indexOf(day as (typeof DAY_NAMES)[number]);
  return i === -1 ? 99 : i;
}

/** Days that actually exist in the dataset, in week order. Never fabricated. */
export function collectDays(entries: ScheduleEntry[]): string[] {
  const present = new Set(entries.map((e) => e.day));
  return DAY_NAMES.filter((d) => present.has(d));
}

/** Local device day name — computed in the browser, never on a server. */
export function todayName(date = new Date()): string {
  return DAY_NAMES[(date.getDay() + 6) % 7];
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

export function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Minutes elapsed since local midnight on the student's device. */
export function nowMinutes(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** 13:00 → "1:00 PM" */
export function formatTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatRange(start: string, end: string): string {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null) return `${start}–${end}`;
  return `${formatTime(s)}–${formatTime(e)}`;
}

/**
 * Selectable time options: every full hour from one hour before the earliest
 * class to the latest class end — derived from the dataset, never invented.
 */
export function timeOptions(entries: ScheduleEntry[]): number[] {
  let min = Infinity;
  let max = -Infinity;
  for (const e of entries) {
    const s = toMinutes(e.start);
    const en = toMinutes(e.end);
    if (s === null || en === null) continue;
    min = Math.min(min, s);
    max = Math.max(max, en);
  }
  if (min === Infinity) return [];
  const firstHour = Math.floor(min / 60) * 60;
  const lastHour = Math.min(23 * 60, Math.ceil(max / 60) * 60);
  const out: number[] = [];
  for (let t = firstHour; t <= lastHour; t += 60) out.push(t);
  return out;
}

/* ------------------------------------------------------------------ */
/* Room helpers                                                        */
/* ------------------------------------------------------------------ */

/** Numeric-aware sort so "201" < "201A" < "302". */
export function collectRooms(entries: ScheduleEntry[]): string[] {
  return Array.from(new Set(entries.map((e) => e.room))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function entriesForRoomDay(
  entries: ScheduleEntry[],
  room: string,
  day: string,
): ScheduleEntry[] {
  return entries
    .filter((e) => e.room === room && e.day === day)
    .sort(
      (a, b) =>
        (toMinutes(a.start) ?? 0) - (toMinutes(b.start) ?? 0),
    );
}

/**
 * Status of one room at one minute of one day, derived purely from the
 * published schedule. "available" ≠ physically vacant (see disclaimer).
 */
export function roomAt(
  entries: ScheduleEntry[],
  room: string,
  day: string,
  minutes: number,
): RoomAtTime {
  const dayEntries = entriesForRoomDay(entries, room, day);
  if (dayEntries.length === 0) {
    return { room, status: "none", current: null, next: null };
  }
  const current =
    dayEntries.find((e) => {
      const s = toMinutes(e.start);
      const en = toMinutes(e.end);
      return s !== null && en !== null && s <= minutes && minutes < en;
    }) ?? null;
  if (current) return { room, status: "occupied", current, next: null };
  const next =
    dayEntries.find((e) => {
      const s = toMinutes(e.start);
      return s !== null && s > minutes;
    }) ?? null;
  return { room, status: "available", current: null, next };
}

/** Every room with its status at one day/minute. */
export function allRoomsAt(
  entries: ScheduleEntry[],
  day: string,
  minutes: number,
): RoomAtTime[] {
  return collectRooms(entries).map((room) =>
    roomAt(entries, room, day, minutes),
  );
}

/**
 * Room timeline for a day: each class block with the true gaps in between
 * marked as free. Generated locally from the schedule — nothing fabricated
 * before the first or after the last class.
 */
export function buildRoomTimeline(
  entries: ScheduleEntry[],
  room: string,
  day: string,
): TimelineBlock[] {
  const dayEntries = entriesForRoomDay(entries, room, day);
  const blocks: TimelineBlock[] = [];
  for (let i = 0; i < dayEntries.length; i++) {
    const entry = dayEntries[i];
    if (i > 0) {
      const prev = dayEntries[i - 1];
      const prevEnd = toMinutes(prev.end);
      const start = toMinutes(entry.start);
      if (prevEnd !== null && start !== null && start > prevEnd) {
        blocks.push({ kind: "free", start: prev, end: entry, entry: null });
      }
    }
    blocks.push({ kind: "class", start: null, end: null, entry });
  }
  return blocks;
}

/** First/last class of a room's day (for the room detail panel). */
export function firstAndLast(dayEntries: ScheduleEntry[]): {
  first: ScheduleEntry | null;
  last: ScheduleEntry | null;
} {
  if (dayEntries.length === 0) return { first: null, last: null };
  return { first: dayEntries[0], last: dayEntries[dayEntries.length - 1] };
}

/* ------------------------------------------------------------------ */
/* Client-side search                                                  */
/* ------------------------------------------------------------------ */

/** "PSY 123" and "psy123" collapse to the same key. */
function squash(value: string): string {
  return value.toLowerCase().replace(/[\s.]/g, "");
}

function roomKey(room: string): string {
  return squash(room.replace(/^room\s*/i, ""));
}

function tokenMatches(entry: ScheduleEntry, rawToken: string): boolean {
  const token = rawToken.trim().toLowerCase();
  if (!token) return true;
  const squashed = squash(token);

  // "Room 201" / "201"
  const bareRoom = token.replace(/^room\s*/i, "").trim();
  if (roomKey(entry.room) === roomKey(bareRoom)) return true;

  // Day names ("tue", "tuesday")
  const day = DAY_NAMES.find(
    (d) =>
      d.toLowerCase().startsWith(squashed) ||
      DAY_SHORT[d].toLowerCase() === squashed,
  );
  if (day && entry.day === day) return true;

  // Times ("1:00", "1:30 pm", "13:00")
  for (const t of [entry.start, entry.end]) {
    const minutes = toMinutes(t);
    if (minutes === null) continue;
    const formatted = formatTime(minutes).toLowerCase();
    const flat = formatted.replace(" ", "");
    if (formatted.includes(token) || flat.includes(squashed)) return true;
  }

  // Course / section / instructor / building (squashed contains)
  const fields = [entry.course, entry.section, entry.instructor, entry.building];
  return fields.some((f) => f && squash(f).includes(squashed));
}

/**
 * Instant local search over the loaded dataset. Every space-separated token
 * must match somewhere (course, code, section, room, day, time, instructor),
 * so "PSY 115 BSP 3C" pins down exactly one class.
 */
export function searchEntries(
  entries: ScheduleEntry[],
  query: string,
): ScheduleEntry[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return entries.filter((entry) =>
    tokens.every((token) => tokenMatches(entry, token)),
  );
}

/** Room numbers whose label matches the query (e.g. "301", "room 201"). */
export function searchRooms(
  rooms: string[],
  query: string,
): string[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return rooms.filter((room) =>
    tokens.every((token) => {
      const bare = squash(token.replace(/^room\s*/i, ""));
      if (!bare) return true;
      return roomKey(room).includes(bare);
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Validation / sanitising                                             */
/* ------------------------------------------------------------------ */

const OPTIONAL_TEXT_FIELDS = ["section", "instructor", "building"] as const;

/**
 * Keeps only well-formed entries with only the known fields — the interface
 * renders exactly what the administrator published, never more.
 */
export function sanitizeDataset(raw: unknown): ScheduleDataset | null {
  if (typeof raw !== "object" || raw === null) return null;
  const meta = (raw as { meta?: unknown }).meta;
  const entries = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return null;

  const safeMeta: ScheduleMeta =
    typeof meta === "object" && meta !== null
      ? {
          updated:
            typeof (meta as ScheduleMeta).updated === "string"
              ? (meta as ScheduleMeta).updated
              : undefined,
          source:
            typeof (meta as ScheduleMeta).source === "string"
              ? (meta as ScheduleMeta).source
              : undefined,
          term:
            typeof (meta as ScheduleMeta).term === "string"
              ? (meta as ScheduleMeta).term
              : undefined,
          sample: (meta as ScheduleMeta).sample === true,
          stale: (meta as ScheduleMeta).stale === true,
          building:
            typeof (meta as ScheduleMeta).building === "string"
              ? (meta as ScheduleMeta).building
              : undefined,
        }
      : {};

  const safeEntries: ScheduleEntry[] = [];
  for (const item of entries) {
    if (typeof item !== "object" || item === null) continue;
    const e = item as Record<string, unknown>;
    const day = typeof e.day === "string" ? e.day.trim() : "";
    const start = typeof e.start === "string" ? e.start.trim() : "";
    const end = typeof e.end === "string" ? e.end.trim() : "";
    const room = typeof e.room === "string" ? e.room.trim() : "";
    const s = toMinutes(start);
    const en = toMinutes(end);
    if (!day || !room || s === null || en === null || s >= en) continue;
    const entry: ScheduleEntry = { day, start, end, room };
    const course =
      typeof e.course === "string" ? e.course.trim() : "";
    if (course) entry.course = course;
    for (const field of OPTIONAL_TEXT_FIELDS) {
      const value = e[field];
      if (typeof value === "string" && value.trim()) {
        entry[field] = value.trim();
      }
    }
    safeEntries.push(entry);
  }

  return { meta: safeMeta, entries: safeEntries };
}
