/**
 * Objective data analysis for the Constituency Check PDF report.
 *
 * This module contains ONLY fixed arithmetic rules. It never writes prose,
 * never interprets the numbers, never recommends anything and never guesses
 * a value that was not supplied by the Google Sheet.
 *
 * Every report runs the exact same rules in the exact same order, so the
 * analysis section has the same shape in every PDF — only the numbers change.
 *
 * Rules (identical for every report):
 *   1. Total Reported Responses = Safe + Apektado ng Baha + Walang Internet /
 *      Mabagal ang Internet Connection. (The formula defined for this report;
 *      it is a total of reported responses, not a verified count of unique
 *      students.)
 *   2. Share of Total = (category value / Total Reported Responses) x 100,
 *      rounded to one decimal place. Omitted when the total is 0.
 *   3. Highest / Lowest reported category = the category with the greatest /
 *      smallest reported value; ties are named. Omitted when the total is 0.
 *   4. Combined reported responses (Apektado ng Baha + Walang Internet /
 *      Mabagal ang Internet Connection) is reported as a plain sum only.
 *
 * IMPORTANT (data-integrity rule): the three categories are reported
 * independently by the Google Form. The source data does NOT establish that
 * they are mutually exclusive, so no figure here is ever presented as a count
 * of unique students, and no overlap is estimated or subtracted.
 */

export type ConstituencyCategoryKey = "safe" | "baha" | "internet";

/** Fixed display order — the same in every report. */
export const CATEGORY_ORDER: readonly ConstituencyCategoryKey[] = [
  "safe",
  "baha",
  "internet",
];

/** Labels fixed by the Google Sheet columns (B, C, E). */
export const CATEGORY_LABELS: Record<ConstituencyCategoryKey, string> = {
  safe: "Safe",
  baha: "Apektado ng Baha",
  internet: "Walang Internet / Mabagal ang Internet Connection",
};

/** The formula shown in every report, verbatim. */
export const TOTAL_LABEL = "Total Reported Responses";

export const TOTAL_FORMULA =
  "Safe + Apektado ng Baha + Walang Internet / Mabagal ang Internet Connection";

export type ConstituencyFigures = Record<ConstituencyCategoryKey, number>;

export type AnalysisCategory = {
  key: ConstituencyCategoryKey;
  label: string;
  /** The reported figure for this category. */
  value: number;
  /** Share of Total Reported Responses, or null when it cannot be calculated. */
  percent: number | null;
};

export type ObjectiveAnalysis = {
  /** The three reported categories, in fixed order. */
  categories: AnalysisCategory[];
  /** Total Reported Responses (sum of the three categories). */
  total: number;
  /** False when the total is 0 — percentages and comparisons are then omitted. */
  percentagesAvailable: boolean;
  /** Category/categories with the greatest value; null when not calculable. */
  highest: AnalysisCategory[] | null;
  /** Category/categories with the smallest value; null when not calculable. */
  lowest: AnalysisCategory[] | null;
  /** Plain sum of Apektado ng Baha + Walang Internet (never a unique count). */
  combinedBahaInternet: number;
};

/**
 * Runs the fixed analysis rules over one period's reported figures.
 * Negative or non-finite input is clamped to 0 so the report can never
 * display a value that was not in the source data.
 */
export function analyseConstituency(
  figures: ConstituencyFigures,
): ObjectiveAnalysis {
  const values: Record<ConstituencyCategoryKey, number> = {
    safe: normalise(figures.safe),
    baha: normalise(figures.baha),
    internet: normalise(figures.internet),
  };

  const total = values.safe + values.baha + values.internet;
  const percentagesAvailable = total > 0;

  const categories: AnalysisCategory[] = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    value: values[key],
    percent: percentagesAvailable
      ? percentOf(values[key], total)
      : null,
  }));

  const highest = percentagesAvailable ? extremes(categories, "max") : null;
  const lowest = percentagesAvailable ? extremes(categories, "min") : null;

  return {
    categories,
    total,
    percentagesAvailable,
    highest,
    lowest,
    combinedBahaInternet: values.baha + values.internet,
  };
}

function normalise(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

/** Fixed percentage formula: (part / whole) x 100, 1 decimal place. */
export function percentOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/** Every category holding the extreme value (ties are kept, never broken). */
function extremes(
  categories: AnalysisCategory[],
  direction: "max" | "min",
): AnalysisCategory[] {
  const values = categories.map((category) => category.value);
  const target =
    direction === "max" ? Math.max(...values) : Math.min(...values);
  return categories.filter((category) => category.value === target);
}

/** "64.6%" — displayed only when the percentage exists. */
export function formatPercent(percent: number | null): string {
  return percent === null ? "—" : `${percent.toFixed(1)}%`;
}

/** Joins tied categories: "Safe", "Safe and Apektado ng Baha", "A, B and C". */
export function joinCategories(categories: AnalysisCategory[]): string {
  const labels = categories.map((category) => category.label);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
