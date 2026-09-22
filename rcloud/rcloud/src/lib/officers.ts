/**
 * Officer list helpers — used by the public Officers page.
 *
 * Everything here is derived from the roster the admin maintains: a "program"
 * only exists when the officer record actually carries a portfolio, and scope
 * (executive vs board) is read from the position text. Nothing is inferred
 * beyond what the record says.
 */

import type { Officer, OfficerAvailability } from "./types";

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
