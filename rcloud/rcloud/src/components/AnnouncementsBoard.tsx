"use client";

import { useMemo, useState } from "react";
import { IconArrowRight, IconBell } from "@/components/Icons";
import { monthKey, monthLabel } from "@/lib/format";
import type { Announcement } from "@/lib/types";

/**
 * Month-based announcement limiter for the home feed.
 * - "This month" renders full announcement cards.
 * - Past months collapse behind month buttons into a minimal list.
 * - Images are intentionally omitted to keep the bulletin data-friendly.
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
    <div className="mt-8 overflow-hidden rounded-[24px] border border-warn/30 bg-panel shadow-[0_20px_60px_oklch(0.1_0.03_292/0.3)]">
      <div className="border-b border-warn/20 bg-warn/5 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warn/30 bg-warn/10 text-warn">
            <IconBell size={19} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-warn">
              Official notice board
            </p>
            <p className="mt-1 text-sm leading-relaxed text-mist">
              Council advisories, reminders and opportunities in one place.
            </p>
          </div>
        </div>

        {byMonth.length > 0 && (
          <div
            role="group"
            aria-label="Browse announcements by month"
            className="mt-5 flex flex-wrap gap-2"
          >
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
                      ? "border-warn/50 bg-warn/15 text-warn"
                      : "border-line bg-night/60 text-mist hover:border-warn/30 hover:text-snow active:bg-warn/10"
                  }`}
                >
                  {key === currentKey ? "This month" : monthLabel(key)}
                  <span
                    className={`tnum ms-2 text-[10px] ${
                      active ? "text-warn" : "text-dim"
                    }`}
                  >
                    {list.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {selectedItems.length === 0 ? (
          <p className="text-sm text-mist">No announcements this month.</p>
        ) : isCurrent ? (
          <div className="grid gap-4 md:grid-cols-3">
            {selectedItems.map((item) => (
              <article
                key={item.id}
                className="relative flex h-full flex-col gap-3 overflow-hidden rounded-[18px] border border-warn/20 bg-night/60 p-5 transition-colors duration-200 before:absolute before:inset-y-0 before:start-0 before:w-1 before:bg-warn/60 hover:border-warn/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-warn">
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
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-2 text-sm font-semibold text-warn transition-colors hover:text-snow"
                  >
                    Read more
                    <IconArrowRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-warn/15 rounded-[18px] border border-warn/20 bg-night/60">
            {selectedItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
              >
                <span className="font-display text-sm font-bold text-snow">
                  {item.title}
                </span>
                <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-warn">
                  {item.category}
                </span>
                <time dateTime={item.date} className="tnum text-xs text-dim">
                  {new Date(item.date).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ms-auto inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-warn transition-colors hover:text-snow"
                  >
                    Read more
                    <IconArrowRight size={13} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
