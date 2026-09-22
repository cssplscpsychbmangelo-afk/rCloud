/**
 * Officer list helpers — used by the public Officers page.
 *
 * Everything here is derived from the roster the admin maintains: a "program"
 * only exists when the officer record actually carries a portfolio, and scope
 * (executive vs board) is read from the position text. Nothing is inferred
 * beyond what the record says.
 */

import type { Officer, OfficerAvailability } from "./types";
import { DAY_NAMES, toMinutes } from "./roomfinder";
import { EO_COLUMNS, type EoColumn } from "./data/officerAvailabilityEo";

/** "Board Member — Psychology" → { position: "Board Member", program: "Psychology" } */
export function splitPosition(officer: Officer): {
  position: string;
  program: string | null;
} {
  const portfolio = (officer.portfolio ?? "").trim();
  if (portfolio) return { position: officer.position.trim(), program: portfolio };
  const [head, ...rest] = officer.position.split("—");
  const tail = rest.join("—").trim();
  return {
    position: head.trim(),
    program: tail || null,
  };
}

/** Officers who represent a program (board members) vs the executive posts. */
export type OfficerScope = "all" | "exec" | "board";

export type OfficerSort = "order" | "az";

export interface OfficerFilters {
  query: string;
  scope: OfficerScope;
  /** `null` = every program. */
  program: string | null;
  sort: OfficerSort;
}

/** Distinct programs in roster order — never invented, never re-sorted. */
export function collectPrograms(officers: Officer[]): string[] {
  const seen: string[] = [];
  for (const officer of officers) {
    const { program } = splitPosition(officer);
    if (program && !seen.includes(program)) seen.push(program);
  }
  return seen;
}

export function hasProgram(officer: Officer): boolean {
  return splitPosition(officer).program !== null;
}

export function officerMatchesScope(officer: Officer, scope: OfficerScope): boolean {
  if (scope === "all") return true;
  if (scope === "board") return hasProgram(officer);
  return !hasProgram(officer);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Case-insensitive, word-wise search across name, position and program. */
export function officerMatchesQuery(officer: Officer, query: string): boolean {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const { position, program } = splitPosition(officer);
  const haystack = normalize(
    [officer.name, position, program ?? "", officer.description]
      .filter(Boolean)
      .join(" "),
  );
  return tokens.every((token) => haystack.includes(token));
}

/** Applies every active filter and returns the roster in the chosen order. */
export function selectOfficers(
  officers: Officer[],
  filters: OfficerFilters,
): Officer[] {
  const filtered = officers.filter(
    (officer) =>
      officerMatchesScope(officer, filters.scope) &&
      officerMatchesQuery(officer, filters.query) &&
      (filters.program === null ||
        splitPosition(officer).program === filters.program),
  );
  if (filters.sort === "az") {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...filtered].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** "Monday" for weekly blocks, "25 September 2026" for dated ones. */
export function slotLabel(slot: OfficerAvailability): string {
  if (slot.kind === "date" && slot.date) {
    const parsed = new Date(`${slot.date}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
      }).format(parsed);
    }
    return slot.date;
  }
  return slot.day || "Schedule";
}

/** A short label for the active filter set, e.g. "Board members · Psychology". */
export function describeFilters(
  filters: OfficerFilters,
  programs: string[],
): string | null {
  const parts: string[] = [];
  if (filters.scope === "exec") parts.push("Executive posts");
  if (filters.scope === "board") parts.push("Program representatives");
  if (filters.program) parts.push(filters.program);
  if (filters.query.trim()) parts.push(`“${filters.query.trim()}”`);
  void programs;
  return parts.length > 0 ? parts.join(" · ") : null;
}

/* ------------------------------------------------------------------ */
/* Duty hours — is an officer in a published block right now?          */
/* ------------------------------------------------------------------ */

/** Local calendar date as "YYYY-MM-DD" (the student's device, not a server). */
function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * True while `now` falls inside the block.
 *
 * Weekly blocks match on the local weekday; dated blocks match on the local
 * calendar date. Times are compared in minutes, so a block never "runs" on a
 * day the council did not publish.
 */
export function isSlotLive(
  slot: OfficerAvailability,
  now: Date = new Date(),
): boolean {
  const start = toMinutes(slot.start);
  const end = toMinutes(slot.end);
  if (start === null || end === null || start >= end) return false;
  if (slot.kind === "date") {
    if (slot.date !== localDateKey(now)) return false;
  } else {
    const today = DAY_NAMES[(now.getDay() + 6) % 7];
    if (slot.day !== today) return false;
  }
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= start && minutes < end;
}

/** The block an officer is inside right now, if any. */
export function liveSlot(
  slots: OfficerAvailability[],
  now: Date = new Date(),
): OfficerAvailability | null {
  return slots.find((slot) => isSlotLive(slot, now)) ?? null;
}

/** True when any of the officer's published blocks covers `now`. */
export function isOnDutyNow(
  slots: OfficerAvailability[],
  now: Date = new Date(),
): boolean {
  return liveSlot(slots, now) !== null;
}

/* ------------------------------------------------------------------ */
/* Executive Order No. 10 schedule ↔ roster matching                   */
/* ------------------------------------------------------------------ */

export type MatchedEoColumn = { column: EoColumn; officer: Officer };

/**
 * Matches each column of the published availability schedule to a roster
 * record: by position first, then portfolio, and finally by roster order when
 * a position has several holders (the order lists two Psychology board
 * members). Columns that match nobody are returned separately — they are
 * reported, never attached to the wrong officer.
 */
export function matchEoColumns(officers: Officer[]): {
  matched: MatchedEoColumn[];
  unmatched: EoColumn[];
} {
  const matched: MatchedEoColumn[] = [];
  const unmatched: EoColumn[] = [];
  for (const column of EO_COLUMNS) {
    const candidates = officers.filter((officer) => {
      if (!officer.position.toLowerCase().includes(column.position.toLowerCase())) {
        return false;
      }
      if (
        column.portfolio &&
        !(officer.portfolio ?? "").toLowerCase().includes(column.portfolio.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
    const officer = candidates[column.index ?? 0];
    if (officer) matched.push({ column, officer });
    else unmatched.push(column);
  }
  return { matched, unmatched };
}

/**
 * The transcribed Executive Order schedule, shaped like published hours.
 *
 * Used only while the council has not published any hours of its own: the
 * moment the table has rows (Admin → Officers, including the one-click
 * "Load EO No. 10" button) those are the single source, so an edited block is
 * never mixed with this transcription. Ids are prefixed `eo:` so callers can
 * tell the two apart if they ever need to.
 */
export function eoAvailabilityFor(officers: Officer[]): OfficerAvailability[] {
  const { matched } = matchEoColumns(officers);
  const slots: OfficerAvailability[] = [];
  for (const { column, officer } of matched) {
    for (const block of column.blocks) {
      slots.push({
        id: `eo:${officer.id}:${block.day}:${block.start}`,
        officerId: officer.id,
        kind: "weekly",
        day: block.day,
        date: "",
        start: block.start,
        end: block.end,
        location: "",
        note: "",
      });
    }
  }
  return slots;
}
