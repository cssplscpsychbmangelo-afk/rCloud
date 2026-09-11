"use client";

import { useState } from "react";
import type { ConstituencyPeriod } from "@/lib/types";
import { StatCard } from "@/components/Cards";
import { formatNumber } from "@/lib/format";

/**
 * Constituency Check browser — one Google Sheet tab is one date/date-range.
 * Only the three approved totals are ever sent to the client.
 */

const FIELDS: Array<{
  key: "safe" | "baha" | "internet";
  label: string;
}> = [
  { key: "baha", label: "Apektado ng Baha" },
  { key: "safe", label: "Safe" },
  { key: "internet", label: "Walang Internet / Mabagal ang Internet Connection" },
];

export default function ConstituencyBrowser({
  periods,
  lastSyncedAt,
}: {
  periods: ConstituencyPeriod[];
  lastSyncedAt: string | null;
}) {
  // Default to the most recent period (last tab in the Sheet).
  const [index, setIndex] = useState(periods.length - 1);
  const period = periods[index] ?? periods[periods.length - 1];
  if (!period) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="constituency-period"
          className="text-xs font-bold uppercase tracking-[0.16em] text-dim"
        >
          Constituency Check
        </label>
        <select
          id="constituency-period"
          value={index}
          onChange={(event) => setIndex(Number(event.target.value))}
          className="h-11 rounded-xl border border-line bg-panel px-3.5 text-sm font-semibold text-snow focus:border-vio-500 focus:outline-none"
        >
          {periods.map((entry, entryIndex) => (
            <option key={entry.id} value={entryIndex}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {FIELDS.map((field) => (
          <StatCard
            key={field.key}
            label={field.label}
            value={formatNumber(period[field.key])}
            hint={period.label}
          />
        ))}
      </div>

      {lastSyncedAt && (
        <p className="mt-6 text-xs text-dim">Last updated: {lastSyncedAt}</p>
      )}
    </div>
  );
}
