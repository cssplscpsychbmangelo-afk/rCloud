"use client";

import { useMemo, useState } from "react";
import { monthKey, monthLabel } from "@/lib/format";
import type { Announcement } from "@/lib/types";

/**
 * Month-based announcement limiter for the home feed.
 * - "This month" renders full announcement cards.
 * - Past months collapse behind month buttons into a minimal list.
 */
export default function AnnouncementsBoard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const currentKey = monthKey(new Date());

  const byMonth = useMemo(() => {
    const map = new Map<string, Announcement[]>();
    for (const item of announcements) {
      const key = monthKey(new Date(item.date));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [announcements]);

  const keys = byMonth.map(([key]) => key);
  const [selected, setSelected] = useState<string>(
    () => (keys.includes(currentKey) ? currentKey : keys[0] ?? currentKey),
  );

  const selectedItems = byMonth.find(([key]) => key === selected)?.[1] ?? [];
  const isCurrent = selected === currentKey;

  return (
    <div className="mt-8">
      <div role="group" aria-label="Browse announcements by month" className="flex flex-wrap gap-2">
        {byMonth.map(([key, list]) => {
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={active}
              className={`min-h-11 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 press ${
                active
                  ? "border-vio-500 bg-vio-950 text-vio-200"
                  : "border-line bg-panel text-mist hover:border-line-2 hover:text-snow active:border-vio-500"
              }`}
            >
              {key === currentKey ? "This month" : monthLabel(key)}
              <span className={`tnum ms-2 text-[10px] ${active ? "text-vio-300" : "text-dim"}`}>
                {list.length}
              </span>
            </button>
          );
        })}
      </div>

      {selectedItems.length === 0 ? (
        <p className="mt-6 text-sm text-mist">No announcements this month.</p>
      ) : isCurrent ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {selectedItems.map((item) => (
            <article
              key={item.id}
              className="flex h-full flex-col gap-3 rounded-[20px] border border-line bg-panel p-5 transition-colors duration-200 hover:border-line-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-vio-500/40 bg-vio-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-vio-300">
                  {item.category}
                </span>
                <time dateTime={item.date} className="tnum text-xs text-dim">
                  {new Date(item.date).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
              <h3 className="font-display text-base font-bold text-snow">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-mist">{item.content}</p>
            </article>
          ))}
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-[20px] border border-line bg-panel">
          {selectedItems.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <span className="font-display text-sm font-bold text-snow">
                {item.title}
              </span>
              <span className="rounded-full border border-vio-500/40 bg-vio-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-vio-300">
                {item.category}
              </span>
              <time dateTime={item.date} className="tnum text-xs text-dim">
                {new Date(item.date).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
