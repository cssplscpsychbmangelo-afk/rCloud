"use client";

import { useEffect, useMemo, useState } from "react";
import type { Officer, OfficerAvailability } from "@/lib/types";
import { splitPosition } from "@/lib/officers";
import { DAY_NAMES, formatTime, toMinutes } from "@/lib/roomfinder";
import { EO_DAYS, EO_SCHEDULE } from "@/lib/data/officerAvailabilityEo";
import { IconClock, IconPin } from "@/components/Icons";

/**
 * Weekly availability grid — the Executive Order's timetable, rebuilt from the
 * published blocks.
 *
 * A cell is green while the officer has no scheduled class inside that hour
 * (that is what "available" means in the order), red when the block list shows
 * class time, and dim when that officer has no published hours for the day at
 * all — the grid never claims someone is free without a published block behind
 * it. Lunch is drawn as the order draws it: a single band across the day.
 *
 * Everything is computed in the browser from the roster + blocks the server
 * already sent; the local clock marks "now" and never asks a server.
 */

const LUNCH_START = toMinutes(EO_SCHEDULE.lunch.start) ?? 12 * 60;
const LUNCH_END = toMinutes(EO_SCHEDULE.lunch.end) ?? 13 * 60;

function todayName(date: Date): string {
  return DAY_NAMES[(date.getDay() + 6) % 7];
}

function hourLabel(minutes: number): string {
  return formatTime(minutes);
}

export default function OfficersTimetable({
  officers,
  availability,
  onPickOfficer,
}: {
  officers: Officer[];
  availability: OfficerAvailability[];
  /** Opens the matching card in the roster below. */
  onPickOfficer?: (officerId: string) => void;
}) {
  const publishedIds = useMemo(
    () => new Set(availability.map((slot) => slot.officerId)),
    [availability],
  );
  const withHours = officers.filter((officer) => publishedIds.has(officer.id));

  const [now, setNow] = useState(() => new Date());
  const [day, setDay] = useState<string>(() => {
    const today = todayName(new Date());
    return (EO_DAYS as readonly string[]).includes(today) ? today : "Monday";
  });
  const [freeNowOnly, setFreeNowOnly] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Hours drawn = whatever the published blocks span (never an invented range).
  const [firstHour, lastHour] = useMemo(() => {
    let min = toMinutes(EO_SCHEDULE.grid.start) ?? 8 * 60;
    let max = toMinutes(EO_SCHEDULE.grid.end) ?? 17 * 60;
    for (const slot of availability) {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (start !== null) min = Math.min(min, start);
      if (end !== null) max = Math.max(max, end);
    }
    return [Math.floor(min / 60) * 60, Math.ceil(max / 60) * 60];
  }, [availability]);

  const slotsFor = (officerId: string, weekday: string) =>
    availability.filter((slot) => slot.officerId === officerId && slot.day === weekday);

  const isFreeAt = (officerId: string, weekday: string, minutes: number) =>
    slotsFor(officerId, weekday).some((slot) => {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      return start !== null && end !== null && minutes >= start && minutes < end;
    });

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = todayName(now) === day;
  const inLunch = isToday && nowMinutes >= LUNCH_START && nowMinutes < LUNCH_END;

  const freeNow = useMemo(
    () =>
      (isToday && !inLunch
        ? withHours.filter((officer) => isFreeAt(officer.id, day, nowMinutes))
        : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [withHours, day, nowMinutes, isToday, inLunch, availability],
  );

  const columns = freeNowOnly && isToday ? freeNow : withHours;
  const hours: number[] = [];
  for (let minutes = firstHour; minutes < lastHour; minutes += 60) {
    if (minutes >= LUNCH_START && minutes < LUNCH_END) continue;
    hours.push(minutes);
  }

  if (withHours.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel px-5 py-6 text-center">
        <p className="text-sm font-bold text-snow">
          No availability schedule published yet.
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-mist">
          Once duty hours are published (Admin → Officers → Availability
          schedule), the weekly timetable appears here.
        </p>
      </div>
    );
  }

  const todayLabel = todayName(now);

  return (
    <div className="rounded-2xl border border-line bg-panel p-3 sm:p-4">
      {/* Header: title on the left, day tabs + free-now on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconClock size={14} className="text-vio-300" />
          <h2 className="font-display text-sm font-extrabold tracking-tight text-snow">
            Weekly availability
          </h2>
          <span className="hidden text-[11px] text-dim sm:inline">
            · {EO_SCHEDULE.title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div
            role="group"
            aria-label="Choose a day"
            className="flex rounded-lg border border-line bg-night/40 p-0.5"
          >
            {EO_DAYS.map((name) => {
              const active = day === name;
              const today = todayLabel === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDay(name);
                    setFreeNowOnly(false);
                  }}
                  title={name}
                  className={`relative min-h-7 rounded-md px-2 text-[11px] font-bold transition-colors duration-200 press ${
                    active
                      ? "bg-vio-950 text-vio-200"
                      : "text-mist hover:text-snow"
                  }`}
                >
                  {name.slice(0, 3)}
                  {today && (
                    <span
                      aria-label="today"
                      className="absolute end-0.5 top-0.5 h-1 w-1 rounded-full bg-ok"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {isToday ? (
            <button
              type="button"
              aria-pressed={freeNowOnly}
              onClick={() => setFreeNowOnly((value) => !value)}
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold transition-colors duration-200 press ${
                freeNowOnly
                  ? "border-ok/50 bg-ok/10 text-ok"
                  : "border-line bg-night/40 text-mist hover:text-snow"
              }`}
              title="Show only officers with no class right now"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
              Free now
              <span className="tnum">{freeNow.length}</span>
            </button>
          ) : null}
        </div>
      </div>

      {EO_SCHEDULE.dayNotes[day] && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-mist">
          <IconPin size={12} className="shrink-0 text-dim" />
          {EO_SCHEDULE.dayNotes[day]}
        </p>
      )}

      {freeNowOnly && freeNow.length === 0 ? (
        <p className="mt-3 rounded-lg border border-line bg-night/40 px-3 py-2 text-xs text-mist">
          Nobody has a published free block right now
          {inLunch ? " — it is the lunch break." : "."}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="sticky start-0 z-10 w-14 bg-panel pb-1.5 pe-2 text-[10px] font-bold uppercase tracking-[0.12em] text-dim">
                  Time
                </th>
                {columns.map((officer) => {
                  const { position } = splitPosition(officer);
                  const parts = officer.name.split(" ");
                  const short = `${parts[0]} ${parts.slice(-1)[0]}`;
                  return (
                    <th key={officer.id} className="px-0.5 pb-1.5 align-bottom">
                      <button
                        type="button"
                        onClick={() => onPickOfficer?.(officer.id)}
                        className="block w-full rounded-md px-1 py-0.5 text-center transition-colors duration-200 hover:bg-panel-2 press"
                        title={`${officer.name} — ${position}. Open card`}
                      >
                        <span className="block truncate text-[11px] font-bold text-snow">
                          {short}
                        </span>
                        <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-dim">
                          {position}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map((minutes) => {
                const isNowSlot =
                  isToday && nowMinutes >= minutes && nowMinutes < minutes + 60;
                const rows = [
                  <tr key={minutes}>
                    <td
                      className={`sticky start-0 z-10 whitespace-nowrap pe-2 text-[10px] font-semibold tnum ${
                        isNowSlot ? "bg-panel text-vio-200" : "bg-panel text-dim"
                      }`}
                    >
                      {hourLabel(minutes)}
                    </td>
                    {columns.map((officer) => {
                      const hasHours = slotsFor(officer.id, day).length > 0;
                      const free = isFreeAt(officer.id, day, minutes);
                      const label = !hasHours
                        ? "No hours published"
                        : free
                          ? "Available"
                          : "In class";
                      return (
                        <td key={officer.id} className="p-0.5">
                          <span
                            role="img"
                            aria-label={`${officer.name}, ${hourLabel(minutes)}: ${label}`}
                            title={`${officer.name} · ${hourLabel(minutes)} · ${label}`}
                            className={`block h-6 rounded ${
                              !hasHours
                                ? "bg-night/50"
                                : free
                                  ? "bg-ok/60"
                                  : "bg-bad/25"
                            } ${isNowSlot ? "ring-1 ring-vio-400/70" : ""}`}
                          />
                        </td>
                      );
                    })}
                  </tr>,
                ];
                if (minutes + 60 === LUNCH_START) {
                  rows.push(
                    <tr key="lunch">
                      <td className="sticky start-0 z-10 whitespace-nowrap bg-panel pe-2 text-[10px] font-semibold tnum text-dim">
                        {hourLabel(LUNCH_START)}
                      </td>
                      <td colSpan={columns.length} className="p-0.5">
                        <span className="flex h-5 items-center justify-center rounded bg-panel-2/60 text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
                          Lunch
                        </span>
                      </td>
                    </tr>,
                  );
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-dim">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-sm bg-ok/60" />
          Available
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-sm bg-bad/25" />
          In class
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-sm bg-night/50" />
          No hours
        </span>
        <span className="ms-auto">
          Available = no published class, not a guarantee of presence.
        </span>
      </p>
    </div>
  );
}
