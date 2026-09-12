"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  allRoomsAt,
  collectDays,
  collectRooms,
  formatTime,
  nowMinutes,
  todayName,
} from "@/lib/roomfinder";
import { useSchedule } from "./useSchedule";
import { IconArrowRight, IconClock, IconSearch } from "@/components/Icons";

/**
 * Homepage strip for the CSSP Room Finder.
 *
 * Shows a live "right now" snapshot computed in the browser from the same
 * small static dataset the Room Finder page uses (one fetch, then everything
 * is local). If the dataset cannot be loaded, the quick search and buttons
 * still work — only the live numbers are hidden.
 */
export default function RoomFinderTeaser() {
  const { data } = useSchedule();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const days = useMemo(() => collectDays(entries), [entries]);
  const roomCount = useMemo(() => collectRooms(entries).length, [entries]);

  const today = todayName(now);
  const hasToday = days.includes(today);
  const snapshot = useMemo(() => {
    if (!hasToday) return null;
    return allRoomsAt(entries, today, nowMinutes(now));
  }, [entries, hasToday, today, now]);

  const free = snapshot?.filter((info) => info.status !== "occupied") ?? [];
  const ongoing = snapshot?.filter((info) => info.status === "occupied") ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          Room finder
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-snow sm:text-3xl">
          Find a classroom. Know where to go.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          Check the CSSP class schedule, see which rooms are occupied, and find
          a free room before your next class. Everything runs in your browser.
        </p>

        {/* Quick search — jumps straight into the Room Finder */}
        <form action="/room-finder" method="get" className="mt-5 flex gap-2">
          <label className="relative block grow">
            <span className="sr-only">Search room, class, section</span>
            <IconSearch
              size={17}
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-dim"
            />
            <input
              type="search"
              name="q"
              placeholder="Search room, class, section… e.g. 301 or PSY 123"
              className="h-12 w-full rounded-2xl border border-line bg-panel ps-11 pe-4 text-sm text-snow placeholder:text-dim transition-colors duration-200 focus:border-vio-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            aria-label="Search the schedule"
            className="inline-flex h-12 min-h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-vio-500 text-snow shadow-[0_8px_28px_oklch(0.54_0.22_295/0.35)] transition-colors duration-200 hover:bg-vio-400 active:bg-vio-600 press"
          >
            <IconArrowRight size={17} />
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/room-finder?view=free"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-vio-500 px-5 py-3 text-sm font-semibold text-snow shadow-[0_8px_28px_oklch(0.54_0.22_295/0.35)] transition-colors duration-200 hover:bg-vio-400 active:bg-vio-600 press"
          >
            <IconClock size={16} />
            What&rsquo;s free right now?
          </Link>
          <Link
            href="/room-finder"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-5 py-3 text-sm font-semibold text-snow transition-all duration-200 hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 active:bg-vio-950 press"
          >
            Open Room Finder
            <IconArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Live snapshot — computed locally from the published schedule */}
      <div className="rounded-[24px] border border-line bg-panel/60 p-5">
        {snapshot ? (
          <>
            <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
              Right now
              <span className="tnum font-semibold text-mist">
                {formatTime(nowMinutes(now))} · {today}
              </span>
            </p>
            <dl className="mt-3 grid grid-cols-3 divide-x divide-line border-y border-line">
              {(
                [
                  [String(ongoing.length), "In class"],
                  [String(free.length), "Free rooms"],
                  [String(roomCount), "Rooms today"],
                ] as Array<[string, string]>
              ).map(([value, label]) => (
                <div key={label} className="px-2 py-3 text-center">
                  <dd className="tnum font-display text-2xl font-extrabold text-snow">
                    {value}
                  </dd>
                  <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">
                    {label}
                  </dt>
                </div>
              ))}
            </dl>
            {free.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
                  Free right now
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {free.slice(0, 6).map((info) => (
                    <Link
                      key={info.room}
                      href={`/room-finder?room=${encodeURIComponent(info.room)}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-3 py-1.5 text-xs font-bold text-ok transition-colors duration-200 hover:border-ok/60 active:bg-ok/20 press"
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
                      Room {info.room}
                    </Link>
                  ))}
                  {free.length > 6 && (
                    <Link
                      href="/room-finder?view=free"
                      className="inline-flex min-h-9 items-center rounded-full border border-line bg-panel-2 px-3 py-1.5 text-xs font-bold text-mist transition-colors duration-200 hover:text-snow press"
                    >
                      +{free.length - 6} more
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-sm text-dim">
            The live room snapshot appears once the schedule loads —
            open the Room Finder to browse it now.
          </p>
        )}
      </div>
    </div>
  );
}
