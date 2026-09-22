/**
 * CSSP LSC Officers Availability Schedule — Executive Order No. 10, s. 2026.
 *
 * The order publishes a weekly grid: every officer against the hourly slots
 * 08:00–17:00 (with a 12:00–13:00 lunch break), where a green
 * "No Scheduled Classes" cell means the officer has no class and can therefore
 * be found, and a red "In Class" cell means they are unavailable. Friday is
 * marked "ONLINE CLASS" and carries no on-campus slots.
 *
 * This file stores exactly that: the free ("No Scheduled Classes") blocks per
 * officer per weekday. Anything not covered by a block is class time, so the
 * grid on the site is rebuilt from these blocks and nothing is invented.
 *
 * PROVENANCE — these blocks were transcribed from the published schedule
 * (screenshots of the signed order) so the council does not have to retype
 * them. They are data, not code: every block can be corrected in
 * Admin → Officers → Availability schedule, and "Load EO No. 10" re-applies
 * this transcription. Verify each block against the signed copy before
 * treating it as final.
 */

export const EO_SCHEDULE = {
  id: "eo-10-s-2026",
  title: "Executive Order No. 10, s. 2026",
  heading: "CSSP LSC Officers Availability Schedule",
  term: "AY 2026–2027",
  /** Published break — no officer is listed as available during lunch. */
  lunch: { start: "12:00", end: "13:00" },
  /** Slots the schedule covers; the grid is drawn across these hours. */
  grid: { start: "08:00", end: "17:00" },
  /** Days the order prints with an explicit note instead of a grid. */
  dayNotes: {
    Friday:
      "Online class day — the order publishes no on-campus duty hours for this day.",
  } as Record<string, string>,
  /**
   * Shown wherever the schedule is presented, because the transcript is only
   * as good as the source it was read from.
   */
  provenance:
    "Transcribed from the CSSP LSC Officers Availability Schedule, Executive Order No. 10, s. 2026. Blocks can be corrected in Admin → Officers.",
} as const;

/** Days the order prints, in the order it prints them. */
export const EO_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type EoBlock = { day: string; start: string; end: string };

export type EoColumn = {
  /** Column heading as printed in the order (initials / nickname). */
  column: string;
  /** Roster position this column belongs to ("Governor", "Board Member"…). */
  position: string;
  /** Portfolio/program, when the column represents a program. */
  portfolio?: string;
  /** Which matching officer in roster order when several share a position. */
  index?: number;
  /** Free blocks ("No Scheduled Classes") for this officer. */
  blocks: EoBlock[];
};

export const EO_COLUMNS: EoColumn[] = [
  {
    column: "Gov Gelo",
    position: "Governor",
    blocks: [
      { day: "Monday", start: "08:00", end: "12:00" },
      { day: "Monday", start: "13:00", end: "17:00" },
      { day: "Tuesday", start: "14:00", end: "17:00" },
      { day: "Wednesday", start: "08:00", end: "12:00" },
      { day: "Wednesday", start: "13:00", end: "17:00" },
      { day: "Thursday", start: "13:00", end: "17:00" },
    ],
  },
  {
    column: "VG Luigie",
    position: "Vice Governor",
    blocks: [
      { day: "Monday", start: "08:00", end: "12:00" },
      { day: "Monday", start: "13:00", end: "17:00" },
      { day: "Tuesday", start: "08:00", end: "12:00" },
      { day: "Tuesday", start: "13:00", end: "17:00" },
      { day: "Wednesday", start: "08:00", end: "10:00" },
      { day: "Thursday", start: "13:00", end: "17:00" },
    ],
  },
  {
    column: "Psych BM Joaquin",
    position: "Board Member",
    portfolio: "Psychology",
    index: 0,
    blocks: [
      { day: "Monday", start: "13:00", end: "17:00" },
      { day: "Tuesday", start: "08:00", end: "10:00" },
      { day: "Wednesday", start: "13:00", end: "17:00" },
      { day: "Thursday", start: "13:00", end: "17:00" },
    ],
  },
  {
    column: "Psych BM Josh",
    position: "Board Member",
    portfolio: "Psychology",
    index: 1,
    blocks: [
      { day: "Monday", start: "08:00", end: "12:00" },
      { day: "Monday", start: "13:00", end: "14:00" },
      { day: "Monday", start: "16:00", end: "17:00" },
      { day: "Tuesday", start: "14:00", end: "17:00" },
      { day: "Thursday", start: "11:00", end: "12:00" },
    ],
  },
  {
    column: "Pub Ad BM Pat",
    position: "Board Member",
    portfolio: "Public Administration",
    blocks: [
      { day: "Monday", start: "08:00", end: "12:00" },
      { day: "Monday", start: "13:00", end: "14:00" },
      { day: "Tuesday", start: "08:00", end: "12:00" },
      { day: "Tuesday", start: "13:00", end: "17:00" },
      { day: "Wednesday", start: "08:00", end: "11:00" },
      { day: "Wednesday", start: "13:00", end: "14:00" },
      { day: "Wednesday", start: "15:00", end: "17:00" },
      { day: "Thursday", start: "13:00", end: "14:00" },
    ],
  },
  {
    column: "Soc Work BM Lysa",
    position: "Board Member",
    portfolio: "Social Work",
    blocks: [
      { day: "Monday", start: "08:00", end: "10:00" },
      { day: "Monday", start: "16:00", end: "17:00" },
      { day: "Tuesday", start: "08:00", end: "12:00" },
      { day: "Tuesday", start: "13:00", end: "14:00" },
      { day: "Thursday", start: "08:00", end: "10:00" },
    ],
  },
  {
    column: "Devstud BM Cara",
    position: "Board Member",
    portfolio: "Development Studies",
    blocks: [
      { day: "Monday", start: "16:00", end: "17:00" },
      { day: "Tuesday", start: "14:00", end: "17:00" },
      { day: "Wednesday", start: "16:00", end: "17:00" },
      { day: "Thursday", start: "08:00", end: "10:00" },
      { day: "Thursday", start: "13:00", end: "17:00" },
    ],
  },
];

/** Total published blocks — used in the admin loader copy. */
export const EO_BLOCK_COUNT = EO_COLUMNS.reduce(
  (total, column) => total + column.blocks.length,
  0,
);
