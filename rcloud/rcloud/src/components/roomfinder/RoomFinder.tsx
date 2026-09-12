"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  allRoomsAt,
  buildRoomTimeline,
  collectDays,
  collectRooms,
  DAY_SHORT,
  dayIndex,
  entriesForRoomDay,
  firstAndLast,
  formatRange,
  formatTime,
  nowMinutes,
  roomAt,
  searchEntries,
  searchRooms,
  timeOptions,
  todayName,
  type RoomStatus,
  type RoomAtTime,
  type ScheduleEntry,
  type ScheduleMeta,
  type TimelineBlock,
} from "@/lib/roomfinder";
import { cacheSavedAt, useSchedule } from "./useSchedule";
import {
  IconArrowLeft,
  IconClock,
  IconDoor,
  IconList,
  IconPin,
  IconSearch,
  IconWifiOff,
} from "@/components/Icons";

/* ------------------------------------------------------------------ */
/* Shared styling (rCloud design tokens)                               */
/* ------------------------------------------------------------------ */

const cardCls =
  "rounded-[20px] border border-line bg-panel transition-colors duration-200";

const chipBase =
  "min-h-10 rounded-full border px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-200 press";

function chip(active: boolean): string {
  return active
    ? `${chipBase} border-vio-500 bg-vio-950 text-vio-200`
    : `${chipBase} border-line bg-panel text-mist hover:border-line-2 hover:text-snow`;
}

const inputCls =
  "h-12 w-full rounded-2xl border border-line bg-panel text-sm text-snow placeholder:text-dim transition-colors duration-200 focus:border-vio-500 focus:outline-none";

/* ------------------------------------------------------------------ */
/* Status display — the three published states                         */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<
  RoomStatus,
  { label: string; dot: string; pill: string }
> = {
  occupied: {
    label: "Occupied",
    dot: "bg-bad",
    pill: "border-bad/30 bg-bad/10 text-bad",
  },
  available: {
    label: "Available",
    dot: "bg-ok",
    pill: "border-ok/30 bg-ok/10 text-ok",
  },
  none: {
    label: "No scheduled class",
    dot: "bg-dim",
    pill: "border-line-2 bg-panel-2 text-dim",
  },
};

function StatusPill({ status }: { status: RoomStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${meta.pill}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={`${cardCls} px-6 py-12 text-center`}>
      <p className="font-display text-base font-bold text-snow">{title}</p>
      {hint && <p className="mt-2 text-sm text-mist">{hint}</p>}
    </div>
  );
}

function DayChips({
  days,
  value,
  onChange,
  allowAll,
  allValue = "All days",
}: {
  days: string[];
  value: string | null;
  onChange: (day: string | null) => void;
  allowAll?: boolean;
  allValue?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Day"
      className="flex flex-wrap gap-2"
    >
      {allowAll && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={chip(value === null)}
        >
          {allValue}
        </button>
      )}
      {days.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => onChange(day)}
          aria-pressed={value === day}
          className={chip(value === day)}
        >
          {DAY_SHORT[day] ?? day}
        </button>
      ))}
    </div>
  );
}

function ResultCount({ text }: { text: string }) {
  return (
    <p
      className="tnum mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-dim"
      aria-live="polite"
    >
      {text}
    </p>
  );
}

/** A class schedule entry as a compact card (mobile-first). */
function ClassCard({
  entry,
  onRoom,
}: {
  entry: ScheduleEntry;
  onRoom: (room: string) => void;
}) {
  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold tracking-tight text-snow">
            {entry.course || "Scheduled class"}
          </p>
          {entry.section && (
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-vio-300">
              {entry.section}
            </p>
          )}
          {entry.instructor && (
            <p className="mt-0.5 truncate text-xs text-mist">
              {entry.instructor}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRoom(entry.room)}
          title={`Open Room ${entry.room}`}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-xs font-bold text-snow transition-colors duration-200 hover:border-vio-600/60 hover:text-vio-200 press"
        >
          <IconDoor size={13} />
          RM {entry.room}
        </button>
      </div>
      <p className="tnum mt-3 text-xs font-semibold text-mist">
        {DAY_SHORT[entry.day] ?? entry.day} · {formatRange(entry.start, entry.end)}
      </p>
    </div>
  );
}

function sortChronological(a: ScheduleEntry, b: ScheduleEntry): number {
  return (
    dayIndex(a.day) - dayIndex(b.day) ||
    Number(a.start.replace(":", "")) - Number(b.start.replace(":", "")) ||
    a.room.localeCompare(b.room, undefined, { numeric: true })
  );
}

/* ------------------------------------------------------------------ */
/* Tab: FIND A ROOM                                                    */
/* ------------------------------------------------------------------ */

function RoomCard({
  info,
  onOpen,
}: {
  info: RoomAtTime;
  onOpen: (room: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(info.room)}
      className={`${cardCls} p-4 text-start hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 press`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg font-extrabold tracking-tight text-snow">
          Room {info.room}
        </span>
        <StatusPill status={info.status} />
      </div>
      <div className="mt-2.5 border-t border-line pt-2.5 text-xs">
        {info.status === "occupied" && info.current ? (
          <p className="text-mist">
            <span className="font-bold text-snow">{info.current.course || "Scheduled class"}</span>
            {info.current.section && <> · {info.current.section}</>}
            <span className="tnum block text-dim">
              {formatRange(info.current.start, info.current.end)}
            </span>
          </p>
        ) : info.status === "available" && info.next ? (
          <p className="text-mist">
            Next class:{" "}
            <span className="font-bold text-snow">{info.next.course || "Scheduled class"}</span>
            <span className="tnum block text-dim">
              {formatRange(info.next.start, info.next.end)}
            </span>
          </p>
        ) : info.status === "available" ? (
          <p className="text-dim">No more classes this day.</p>
        ) : (
          <p className="text-dim">Nothing published for this day.</p>
        )}
      </div>
    </button>
  );
}

function FindRoomPanel({
  entries,
  days,
  day,
  onDay,
  useNow,
  now,
  onUseNow,
  fixedTime,
  onFixedTime,
  statusFilter,
  onStatusFilter,
  onOpenRoom,
}: {
  entries: ScheduleEntry[];
  days: string[];
  day: string | null;
  onDay: (day: string | null) => void;
  useNow: boolean;
  now: Date;
  onUseNow: (value: boolean) => void;
  fixedTime: number | null;
  onFixedTime: (value: number | null) => void;
  statusFilter: "all" | "occupied" | "available";
  onStatusFilter: (value: "all" | "occupied" | "available") => void;
  onOpenRoom: (room: string) => void;
}) {
  const activeDay = day ?? days[0] ?? todayName(now);
  const minutes = useNow ? nowMinutes(now) : fixedTime ?? nowMinutes(now);
  const options = useMemo(() => timeOptions(entries), [entries]);
  const isToday = activeDay === todayName(now);

  const rooms = useMemo(
    () => allRoomsAt(entries, activeDay, minutes),
    [entries, activeDay, minutes],
  );
  const filtered = rooms.filter((info) => {
    if (statusFilter === "occupied") return info.status === "occupied";
    if (statusFilter === "available") return info.status !== "occupied";
    return true;
  });

  return (
    <div>
      {/* Day filter — only days that exist in the dataset */}
      <DayChips days={days} value={day} onChange={onDay} />

      {/* Time filter */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onUseNow(true)}
          aria-pressed={useNow}
          className={chip(useNow)}
        >
          <span className="inline-flex items-center gap-1.5">
            <IconClock size={13} />
            Now{useNow ? ` · ${formatTime(minutes)}` : ""}
          </span>
        </button>
        <label className="sr-only" htmlFor="rf-time">
          Time
        </label>
        <select
          id="rf-time"
          value={useNow ? "" : String(fixedTime ?? "")}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "") {
              onUseNow(true);
            } else {
              onUseNow(false);
              onFixedTime(Number(value));
            }
          }}
          className="min-h-10 rounded-full border border-line bg-panel px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-mist transition-colors duration-200 focus:border-vio-500 focus:outline-none"
        >
          <option value="">Pick a time…</option>
          {options.map((t) => (
            <option key={t} value={String(t)}>
              {formatTime(t)}
            </option>
          ))}
        </select>
      </div>

      {/* Occupied / available quick filter */}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Status">
        {(
          [
            ["all", "All rooms"],
            ["occupied", "Currently occupied"],
            ["available", "Currently available"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onStatusFilter(value)}
            aria-pressed={statusFilter === value}
            className={chip(statusFilter === value)}
          >
            {label}
          </button>
        ))}
      </div>

      <ResultCount
        text={`${filtered.length} of ${rooms.length} rooms · ${
          isToday ? "today" : DAY_SHORT[activeDay] ?? activeDay
        } · ${formatTime(minutes)}`}
      />

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {filtered.map((info) => (
            <RoomCard key={info.room} info={info} onOpen={onOpenRoom} />
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No matching rooms found."
            hint="Try another day, time or status filter."
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: WHERE IS MY CLASS?                                             */
/* ------------------------------------------------------------------ */

function FindClassPanel({
  entries,
  days,
  day,
  onDay,
  query,
  onQuery,
  onOpenRoom,
  inputRef,
}: {
  entries: ScheduleEntry[];
  days: string[];
  day: string | null;
  onDay: (day: string | null) => void;
  query: string;
  onQuery: (value: string) => void;
  onOpenRoom: (room: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const results = useMemo(() => {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    const base = day ? entries.filter((e) => e.day === day) : entries;
    if (tokens.length === 0) return base.slice().sort(sortChronological);
    return searchEntries(base, query).sort(sortChronological);
  }, [entries, day, query]);

  // Group by day when browsing across the whole week
  const grouped =
    day === null && query.trim() === ""
      ? days
          .map((d) => [d, results.filter((e) => e.day === d)] as const)
          .filter(([, list]) => list.length > 0)
      : null;

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Course, section, instructor or room</span>
        <IconPin
          size={17}
          className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-dim"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Course / Section — e.g. PSY 115 BSP 3C"
          className={`${inputCls} ps-11 pe-4`}
        />
      </label>

      <div className="mt-3">
        <DayChips
          days={days}
          value={day}
          onChange={onDay}
          allowAll
          allValue="All days"
        />
      </div>

      <ResultCount text={`${results.length} classes`} />

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No classes match your search."
            hint="Check the course code or section, or try another day."
          />
        </div>
      ) : grouped ? (
        <div className="mt-4 space-y-6">
          {grouped.map(([d, list]) => (
            <div key={d}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
                {d}
              </h3>
              <div className="mt-2 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
                {list.map((entry, index) => (
                  <ClassCard
                    key={`${d}-${index}`}
                    entry={entry}
                    onRoom={onOpenRoom}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {results.map((entry, index) => (
            <ClassCard
              key={`${entry.day}-${index}`}
              entry={entry}
              onRoom={onOpenRoom}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab: WHAT'S FREE RIGHT NOW?                                         */
/* ------------------------------------------------------------------ */

function FreeNowPanel({
  entries,
  now,
  onOpenRoom,
}: {
  entries: ScheduleEntry[];
  now: Date;
  onOpenRoom: (room: string) => void;
}) {
  const [filter, setFilter] = useState<"free" | "occupied" | "all">("free");
  const today = todayName(now);
  const minutes = nowMinutes(now);

  const days = useMemo(() => collectDays(entries), [entries]);
  const hasToday = days.includes(today);
  const rooms = useMemo(
    () => (hasToday ? allRoomsAt(entries, today, minutes) : []),
    [entries, hasToday, today, minutes],
  );

  const free = rooms.filter((info) => info.status !== "occupied");
  const occupied = rooms.filter((info) => info.status === "occupied");
  const shown =
    filter === "free" ? free : filter === "occupied" ? occupied : rooms;

  if (!hasToday) {
    return (
      <div>
        <EmptyState
          title="No schedule data available for today."
          hint={`Published days in this schedule: ${days
            .map((d) => DAY_SHORT[d] ?? d)
            .join(" · ")}`}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Free-now filter">
        {(
          [
            ["free", "Free now"],
            ["occupied", "In class now"],
            ["all", "All rooms"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={chip(filter === value)}
          >
            {label}
          </button>
        ))}
      </div>

      <ResultCount
        text={`${free.length} free · ${occupied.length} in class · ${formatTime(
          minutes,
        )} (device clock)`}
      />

      {shown.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No matching rooms found." />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {shown.map((info) => (
            <button
              key={info.room}
              type="button"
              onClick={() => onOpenRoom(info.room)}
              className={`${cardCls} p-4 text-start hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 press`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-extrabold tracking-tight text-snow">
                  Room {info.room}
                </span>
                <StatusPill status={info.status} />
              </div>
              <div className="mt-2.5 border-t border-line pt-2.5 text-xs text-mist">
                {info.status === "occupied" && info.current ? (
                  <p>
                    <span className="font-bold text-snow">
                      {info.current.course || "Scheduled class"}
                    </span>
                    {info.current.section && <> · {info.current.section}</>}
                    <span className="tnum block text-dim">
                      until {formatTime(toMinutesSafe(info.current.end))}
                    </span>
                  </p>
                ) : info.next ? (
                  <p>
                    Next:{" "}
                    <span className="font-bold text-snow">
                      {info.next.course || "Scheduled class"}
                    </span>
                    <span className="tnum block text-dim">
                      {formatTime(toMinutesSafe(info.next.start))} · Room{" "}
                      {info.room}
                    </span>
                  </p>
                ) : info.status === "none" ? (
                  <p className="text-dim">Nothing published today.</p>
                ) : (
                  <p className="text-dim">No more classes today.</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Local safe conversion (already-validated entries). */
function toMinutesSafe(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/* ------------------------------------------------------------------ */
/* Tab: SCHEDULE TABLE                                                 */
/* ------------------------------------------------------------------ */

type SortKey = "day" | "time" | "course" | "section" | "room";

function ScheduleTable({
  entries,
  days,
  onOpenRoom,
}: {
  entries: ScheduleEntry[];
  days: string[];
  onOpenRoom: (room: string) => void;
}) {
  const [day, setDay] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "day",
    dir: 1,
  });

  const hasInstructor = entries.some((e) => e.instructor);
  const hasBuilding = entries.some((e) => e.building);

  const rows = useMemo(() => {
    const base = day ? entries.filter((e) => e.day === day) : entries;
    const q = filter.trim();
    const matched = q ? searchEntries(base, q) : base;
    const sorted = matched.slice().sort((a, b) => {
      const dir = sort.dir;
      switch (sort.key) {
        case "day":
          return (
            dir *
            (dayIndex(a.day) - dayIndex(b.day) ||
              Number(a.start.replace(":", "")) - Number(b.start.replace(":", "")))
          );
        case "time":
          return (
            dir *
            (Number(a.start.replace(":", "")) - Number(b.start.replace(":", "")) ||
              dayIndex(a.day) - dayIndex(b.day))
          );
        case "course":
          return dir * (a.course || "").localeCompare(b.course || "");
        case "section":
          return (
            dir * (a.section ?? "").localeCompare(b.section ?? "") ||
            dir * (a.course || "").localeCompare(b.course || "")
          );
        case "room":
          return (
            dir * a.room.localeCompare(b.room, undefined, { numeric: true }) ||
            dayIndex(a.day) - dayIndex(b.day) ||
            Number(a.start.replace(":", "")) - Number(b.start.replace(":", ""))
          );
      }
    });
    return sorted;
  }, [entries, day, filter, sort]);

  function header(key: SortKey, label: string) {
    const active = sort.key === key;
    const ariaSort = active
      ? sort.dir === 1
        ? ("ascending" as const)
        : ("descending" as const)
      : ("none" as const);
    const button = (
      <button
        type="button"
        onClick={() =>
          setSort((prev) =>
            prev.key === key
              ? { key, dir: prev.dir === 1 ? -1 : 1 }
              : { key, dir: 1 },
          )
        }
        className={`inline-flex min-h-9 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-200 ${
          active ? "text-vio-200" : "text-dim hover:text-snow"
        }`}
      >
        {label}
        <span aria-hidden className="text-[9px]">
          {active ? (sort.dir === 1 ? "▲" : "▼") : "↕"}
        </span>
      </button>
    );
    return { button, ariaSort };
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Filter the schedule table</span>
          <IconSearch
            size={16}
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter — course, section, room, time…"
            className={`${inputCls} h-11 ps-11 pe-4`}
          />
        </label>
        <DayChips
          days={days}
          value={day}
          onChange={setDay}
          allowAll
          allValue="All days"
        />
      </div>

      <ResultCount text={`${rows.length} entries`} />

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No matching classes found."
            hint="Try clearing the filter or picking another day."
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className={`mt-4 hidden overflow-hidden rounded-[20px] border border-line md:block`}>
            <table className="w-full text-start text-sm">
              <thead className="bg-panel-2 text-dim">
                <tr>
                  {(
                    [
                      ["day", "Day"],
                      ["time", "Time"],
                      ["course", "Course"],
                      ["section", "Section"],
                      ["room", "Room"],
                    ] as Array<[SortKey, string]>
                  ).map(([key, label]) => {
                    const h = header(key, label);
                    return (
                      <th
                        key={key}
                        scope="col"
                        aria-sort={h.ariaSort}
                        className="px-4 py-3 text-start"
                      >
                        {h.button}
                      </th>
                    );
                  })}
                  {hasInstructor && (
                    <th scope="col" className="px-4 py-3 text-start text-[10px] font-bold uppercase tracking-[0.14em]">Instructor</th>
                  )}
                  {hasBuilding && (
                    <th scope="col" className="px-4 py-3 text-start text-[10px] font-bold uppercase tracking-[0.14em]">Building</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-panel">
                {rows.map((entry, index) => (
                  <tr key={index} className="transition-colors duration-150 hover:bg-panel-2">
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-mist">
                      {DAY_SHORT[entry.day] ?? entry.day}
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-xs text-mist">
                      {formatRange(entry.start, entry.end)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-snow">
                      {entry.course || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-vio-300">
                      {entry.section ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-snow">
                      {entry.room}
                    </td>
                    {hasInstructor && (
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-mist">
                        {entry.instructor ?? "—"}
                      </td>
                    )}
                    {hasBuilding && (
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-mist">
                        {entry.building ?? "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2 md:hidden">
            {rows.map((entry, index) => (
              <ClassCard key={index} entry={entry} onRoom={onOpenRoom} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick search results (mixed rooms + classes)                        */
/* ------------------------------------------------------------------ */

function SearchResults({
  entries,
  query,
  day,
  minutes,
  onOpenRoom,
}: {
  entries: ScheduleEntry[];
  query: string;
  day: string;
  minutes: number;
  onOpenRoom: (room: string) => void;
}) {
  const rooms = useMemo(
    () => searchRooms(collectRooms(entries), query),
    [entries, query],
  );
  const classes = useMemo(
    () => searchEntries(entries, query).sort(sortChronological),
    [entries, query],
  );
  const shownClasses = classes.slice(0, 30);

  return (
    <div>
      <ResultCount
        text={`${rooms.length} rooms · ${classes.length} classes match`}
      />

      {rooms.length === 0 && classes.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No matching rooms found."
            hint="Try a room number, course code, section or day."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {rooms.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
                Rooms
              </h3>
              <div className="mt-2 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
                {rooms.slice(0, 9).map((room) => {
                  const info = roomAt(entries, room, day, minutes);
                  return (
                    <RoomCard key={room} info={info} onOpen={onOpenRoom} />
                  );
                })}
              </div>
              {rooms.length > 9 && (
                <p className="mt-3 text-xs text-dim">
                  +{rooms.length - 9} more rooms — refine your search.
                </p>
              )}
            </div>
          )}

          {shownClasses.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
                Classes
              </h3>
              <div className="mt-2 grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
                {shownClasses.map((entry, index) => (
                  <ClassCard
                    key={`${entry.day}-${index}`}
                    entry={entry}
                    onRoom={onOpenRoom}
                  />
                ))}
              </div>
              {classes.length > shownClasses.length && (
                <p className="mt-3 text-xs text-dim">
                  +{classes.length - shownClasses.length} more classes — refine
                  your search.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Room detail — timeline + current status (all computed locally)      */
/* ------------------------------------------------------------------ */

function Timeline({
  blocks,
  onNothing,
}: {
  blocks: TimelineBlock[];
  onNothing: string;
}) {
  if (blocks.length === 0) {
    return <p className="text-sm text-dim">{onNothing}</p>;
  }
  return (
    <ol className="relative space-y-2 border-s border-line ps-4">
      {blocks.map((block, index) =>
        block.kind === "class" && block.entry ? (
          <li key={index} className="relative">
            <span
              aria-hidden
              className="absolute -start-[21px] top-2.5 h-2 w-2 rounded-full bg-vio-400"
            />
            <div className="rounded-xl border border-line bg-panel-2 px-3.5 py-2.5">
              <p className="tnum text-[11px] font-bold uppercase tracking-[0.1em] text-dim">
                {formatRange(block.entry.start, block.entry.end)}
              </p>
              <p className="mt-0.5 text-sm font-bold text-snow">
                {block.entry.course || "Scheduled class"}
                {block.entry.section && (
                  <span className="ms-2 text-xs font-semibold text-vio-300">
                    {block.entry.section}
                  </span>
                )}
              </p>
              {block.entry.instructor && (
                <p className="text-xs text-mist">{block.entry.instructor}</p>
              )}
            </div>
          </li>
        ) : (
          <li key={index} className="relative">
            <span
              aria-hidden
              className="absolute -start-[19px] top-3 h-px w-3 bg-line-2"
            />
            <div className="rounded-xl border border-dashed border-line bg-transparent px-3.5 py-2.5">
              <p className="tnum text-[11px] font-bold uppercase tracking-[0.1em] text-dim">
                {formatRange(
                  block.start?.end ?? block.entry?.start ?? "",
                  block.end?.start ?? block.entry?.end ?? "",
                )}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ok">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
                Available
              </p>
            </div>
          </li>
        ),
      )}
    </ol>
  );
}

function RoomDetail({
  entries,
  room,
  days,
  day,
  onDay,
  useNow,
  now,
  onUseNow,
  fixedTime,
  onFixedTime,
  onBack,
}: {
  entries: ScheduleEntry[];
  room: string;
  days: string[];
  day: string | null;
  onDay: (day: string | null) => void;
  useNow: boolean;
  now: Date;
  onUseNow: (value: boolean) => void;
  fixedTime: number | null;
  onFixedTime: (value: number | null) => void;
  onBack: () => void;
}) {
  const activeDay = day ?? days[0] ?? todayName(now);
  const minutes = useNow ? nowMinutes(now) : fixedTime ?? nowMinutes(now);
  const dayEntries = useMemo(
    () => entriesForRoomDay(entries, room, activeDay),
    [entries, room, activeDay],
  );
  const info = roomAt(entries, room, activeDay, minutes);
  const { last } = firstAndLast(dayEntries);
  const timeline = useMemo(
    () => buildRoomTimeline(entries, room, activeDay),
    [entries, room, activeDay],
  );
  const building =
    dayEntries.find((e) => e.building)?.building ?? undefined;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-mist transition-all duration-200 hover:border-vio-600/60 hover:text-snow active:border-vio-500 active:bg-vio-950 press max-sm:w-full max-sm:justify-center"
      >
        <IconArrowLeft size={14} />
        Back
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-snow sm:text-3xl">
          Room {room}
          {building && (
            <span className="ms-3 align-middle text-xs font-semibold uppercase tracking-[0.14em] text-dim">
              {building}
            </span>
          )}
        </h2>
        <StatusPill status={info.status} />
      </div>

      {/* CURRENT STATUS · NEXT · LAST */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
            Current status
          </h3>
          <p className="mt-2 text-sm text-mist">
            {info.status === "occupied" && info.current ? (
              <>
                {info.current.course || "Scheduled class"}
                {info.current.section && <> · {info.current.section}</>}
                <span className="tnum block text-xs text-dim">
                  until {formatTime(toMinutesSafe(info.current.end))}
                </span>
              </>
            ) : info.status === "available" ? (
              <>Free at {formatTime(minutes)}</>
            ) : (
              <>No class published at {formatTime(minutes)}</>
            )}
          </p>
        </div>
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
            Next class
          </h3>
          <p className="mt-2 text-sm text-mist">
            {info.next ? (
              <>
                {info.next.course || "Scheduled class"}
                <span className="tnum block text-xs text-dim">
                  {formatTime(toMinutesSafe(info.next.start))} ·{" "}
                  {formatRange(info.next.start, info.next.end)}
                </span>
              </>
            ) : (
              <span className="text-dim">
                No more classes on {DAY_SHORT[activeDay] ?? activeDay}.
              </span>
            )}
          </p>
        </div>
        <div className={`${cardCls} p-4`}>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
            Last class
          </h3>
          <p className="mt-2 text-sm text-mist">
            {last ? (
              <>
                {last.course || "Scheduled class"}
                <span className="tnum block text-xs text-dim">
                  ends {formatTime(toMinutesSafe(last.end))}
                </span>
              </>
            ) : (
              <span className="text-dim">None published.</span>
            )}
          </p>
        </div>
      </div>

      {/* Day selector for the room's schedule */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
          Schedule by day
        </h3>
        <div className="mt-2">
          <DayChips days={days} value={day} onChange={onDay} />
        </div>
      </div>

      {/* TODAY'S SCHEDULE — timeline generated locally */}
      <div className="mt-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
          {DAY_SHORT[activeDay] ?? activeDay} schedule
        </h3>
        <div className="mt-3">
          <Timeline
            blocks={timeline}
            onNothing="No scheduled classes found for this room."
          />
        </div>
      </div>

      {/* Time reference */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onUseNow(true)}
          aria-pressed={useNow}
          className={chip(useNow)}
        >
          Now{useNow ? ` · ${formatTime(minutes)}` : ""}
        </button>
        <label className="sr-only" htmlFor="rf-time-detail">
          Time
        </label>
        <select
          id="rf-time-detail"
          value={useNow ? "" : String(fixedTime ?? "")}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "") {
              onUseNow(true);
            } else {
              onUseNow(false);
              onFixedTime(Number(value));
            }
          }}
          className="min-h-10 rounded-full border border-line bg-panel px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-mist transition-colors duration-200 focus:border-vio-500 focus:outline-none"
        >
          <option value="">Pick a time…</option>
          {timeOptions(entries).map((t) => (
            <option key={t} value={String(t)}>
              {formatTime(t)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule information footer (version · source · disclaimers)        */
/* ------------------------------------------------------------------ */

function ScheduleInfo({
  meta,
  offline,
  count,
  days,
}: {
  meta: ScheduleMeta;
  offline: boolean;
  count: number;
  days: string[];
}) {
  const savedAt = offline ? cacheSavedAt() : null;
  return (
    <div className="mt-10 space-y-3">
      {meta.sample && (
        <p className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-xs font-semibold leading-relaxed text-warn">
          Sample data is currently loaded. The council must replace{" "}
          <code className="rounded bg-night/60 px-1 py-0.5">
            /data/cssp-schedule.json
          </code>{" "}
          with the official published schedule.
        </p>
      )}
      {meta.stale && (
        <p className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-xs font-semibold leading-relaxed text-warn">
          Schedule may have changed. Please verify with the appropriate
          academic office or instructor.
        </p>
      )}
      {offline && (
        <p className="flex items-center gap-2 rounded-xl border border-line-2 bg-panel px-4 py-3 text-xs font-semibold text-mist">
          <IconWifiOff size={15} className="shrink-0 text-dim" />
          <span>
            Using the most recently loaded schedule
            {savedAt
              ? ` (saved ${new Date(savedAt).toLocaleString()})`
              : ""}
            . Reconnect to refresh.
          </span>
        </p>
      )}

      <dl className="rounded-xl border border-line bg-panel/60 px-4 py-3 text-xs leading-relaxed text-dim">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {meta.updated && (
            <div>
              <dt className="inline font-bold uppercase tracking-[0.14em] text-dim">
                Schedule updated:{" "}
              </dt>
              <dd className="inline text-mist">{meta.updated}</dd>
            </div>
          )}
          {meta.term && (
            <div>
              <dt className="inline font-bold uppercase tracking-[0.14em] text-dim">
                Term:{" "}
              </dt>
              <dd className="inline text-mist">{meta.term}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-bold uppercase tracking-[0.14em] text-dim">
              Entries:{" "}
            </dt>
            <dd className="tnum inline text-mist">{count}</dd>
          </div>
        </div>
        {meta.source && (
          <div className="mt-1">
            <dt className="inline font-bold uppercase tracking-[0.14em] text-dim">
              Source:{" "}
            </dt>
            <dd className="inline text-mist">{meta.source}</dd>
          </div>
        )}
      </dl>

      <p className="text-[11px] leading-relaxed text-dim">
        Room availability is based on the published class schedule and does not
        guarantee physical access or availability. A room may still be
        reserved, locked or in use for an unscheduled activity. Days published
        in this schedule: {days.map((d) => DAY_SHORT[d] ?? d).join(" · ") || "—"}.
        All checks run in your browser — no searches are sent to a server.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Root component                                                      */
/* ------------------------------------------------------------------ */

type Tab = "room" | "class" | "free" | "table";

const TABS: Array<{ id: Tab; label: string; icon: typeof IconDoor }> = [
  { id: "room", label: "Find a room", icon: IconDoor },
  { id: "class", label: "My class", icon: IconPin },
  { id: "free", label: "Free now", icon: IconClock },
  { id: "table", label: "Table", icon: IconList },
];

export default function RoomFinder() {
  const schedule = useSchedule();
  const searchParams = useSearchParams();

  // useSearchParams can be null in non-router contexts; guard all reads.
  function readParam(key: string): string | null {
    try {
      return searchParams?.get(key) ?? null;
    } catch {
      return null;
    }
  }

  // Deep links: /room-finder?q=PSY+115 · ?view=free · ?room=301
  const [initQuery] = useState(() => readParam("q") ?? "");
  const [initTab] = useState<Tab>(() => {
    const view = readParam("view");
    if (view === "free") return "free";
    if (view === "class") return "class";
    if (view === "table") return "table";
    return "room";
  });
  const [initRoom] = useState(() => readParam("room"));

  const [tab, setTab] = useState<Tab>(initTab);
  const [query, setQuery] = useState(initQuery);
  const [classQuery, setClassQuery] = useState("");
  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const [useNow, setUseNow] = useState(true);
  const [fixedTime, setFixedTime] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "occupied" | "available"
  >("all");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(initRoom);
  const [now, setNow] = useState(() => new Date());
  const classInputRef = useRef<HTMLInputElement | null>(null);

  // Local clock — the room finder never asks a server for the time.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const entries = useMemo(() => schedule.data?.entries ?? [], [schedule.data]);
  const days = useMemo(() => collectDays(entries), [entries]);

  // Selected day: the student's pick, else today when published, else the
  // first day that actually exists in the dataset. Never fabricated.
  const autoDay =
    days.length > 0
      ? days.includes(todayName(now))
        ? todayName(now)
        : days[0]
      : null;
  const day =
    dayChoice !== null && days.includes(dayChoice) ? dayChoice : autoDay;

  function openRoom(room: string) {
    setSelectedRoom(room);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openClassTab() {
    setSelectedRoom(null);
    setQuery("");
    setTab("class");
    // Focus the "Where is my class?" input after the switch renders.
    requestAnimationFrame(() => classInputRef.current?.focus());
  }

  /* ----------------------------- states ---------------------------- */

  if (schedule.status === "loading") {
    return (
      <div
        className={`${cardCls} flex min-h-56 items-center justify-center p-8`}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-mist">Loading the schedule…</p>
      </div>
    );
  }

  if (schedule.status === "error" || !schedule.data) {
    return (
      <div className={`${cardCls} px-6 py-12 text-center`}>
        <p className="font-display text-base font-bold text-snow">
          The schedule could not be loaded.
        </p>
        <p className="mt-2 text-sm text-mist">
          Check your connection and try again — the schedule is a small file
          and works offline once loaded.
        </p>
        <button
          type="button"
          onClick={schedule.retry}
          className="mt-5 min-h-11 rounded-xl border border-vio-500 bg-vio-950 px-5 py-2.5 text-sm font-semibold text-vio-200 transition-colors duration-200 hover:bg-vio-700/40 press"
        >
          Try again
        </button>
      </div>
    );
  }

  const searching = query.trim().length > 0;
  const referenceDay = day ?? days[0] ?? todayName(now);

  /* ------------------------------ render --------------------------- */

  return (
    <div>
      {/* QUICK SEARCH — instant, local, never sent anywhere */}
      <label className="relative block">
        <span className="sr-only">
          Where are you looking for a room? Search room, class, section
        </span>
        <IconSearch
          size={18}
          className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-dim"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Where are you looking for a room? Try 301, PSY 123, BSP 3C…"
          className={`${inputCls} ps-11 pe-12`}
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-bold text-dim transition-colors duration-200 hover:text-snow"
          >
            Clear
          </button>
        )}
      </label>

      {/* Mode tabs — hidden while searching so results stay front-and-center */}
      {!searching && !selectedRoom && (
        <div
          role="group"
          aria-label="Room finder modes"
          className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-panel p-1.5 min-[480px]:grid-cols-4"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTab(id);
                  if (id === "class") {
                    requestAnimationFrame(() =>
                      classInputRef.current?.focus(),
                    );
                  }
                }}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold uppercase tracking-[0.06em] transition-colors duration-200 press ${
                  active
                    ? "border border-vio-500 bg-vio-950 text-vio-200"
                    : "border border-transparent text-mist hover:text-snow"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {selectedRoom ? (
          <RoomDetail
            entries={entries}
            room={selectedRoom}
            days={days}
            day={day}
            onDay={setDayChoice}
            useNow={useNow}
            now={now}
            onUseNow={setUseNow}
            fixedTime={fixedTime}
            onFixedTime={setFixedTime}
            onBack={() => setSelectedRoom(null)}
          />
        ) : searching ? (
          <SearchResults
            entries={entries}
            query={query}
            day={referenceDay}
            minutes={useNow ? nowMinutes(now) : fixedTime ?? nowMinutes(now)}
            onOpenRoom={openRoom}
          />
        ) : tab === "room" ? (
          <FindRoomPanel
            entries={entries}
            days={days}
            day={day}
            onDay={setDayChoice}
            useNow={useNow}
            now={now}
            onUseNow={setUseNow}
            fixedTime={fixedTime}
            onFixedTime={setFixedTime}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onOpenRoom={openRoom}
          />
        ) : tab === "class" ? (
          <FindClassPanel
            entries={entries}
            days={days}
            day={day}
            onDay={setDayChoice}
            query={classQuery}
            onQuery={setClassQuery}
            onOpenRoom={openRoom}
            inputRef={classInputRef}
          />
        ) : tab === "free" ? (
          <FreeNowPanel entries={entries} now={now} onOpenRoom={openRoom} />
        ) : (
          <ScheduleTable entries={entries} days={days} onOpenRoom={openRoom} />
        )}
      </div>

      {/* Where is my class? — quick jump (§9) */}
      {!searching && !selectedRoom && tab !== "class" && (
        <button
          type="button"
          onClick={openClassTab}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-panel px-5 py-3 text-sm font-semibold text-vio-300 transition-all duration-200 hover:border-vio-600/60 hover:text-vio-200 active:border-vio-500 active:bg-vio-950 press"
        >
          <IconPin size={16} />
          Where is my class?
        </button>
      )}

      <ScheduleInfo
        meta={schedule.data.meta}
        offline={schedule.offline}
        count={entries.length}
        days={days}
      />

      {/* Future extensions (map, exam finder, notifications) are
          intentionally NOT built — this stays a schedule viewer. */}
      <p className="mt-6 text-center text-[11px] text-dim">
        <Link href="/" className="underline decoration-line-2 underline-offset-4 transition-colors duration-200 hover:text-mist">
          Back to rCloud
        </Link>
      </p>
    </div>
  );
}
