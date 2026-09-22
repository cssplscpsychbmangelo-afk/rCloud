"use client";

import { useEffect, useMemo, useState } from "react";
import type { Officer, OfficerAvailability } from "@/lib/types";
import { splitPosition } from "@/lib/officers";
import { DAY_NAMES, formatTime, toMinutes } from "@/lib/roomfinder";
import { EO_DAYS, EO_SCHEDULE } from "@/lib/data/officerAvailabilityEo";
import { IconArrowRight, IconClock, IconPin } from "@/components/Icons";

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
      <div className="rounded-[20px] border border-line bg-panel px-6 py-10 text-center">
        <p className="font-display text-base font-bold text-snow">
          No availability schedule published yet.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-mist">
          Once the council publishes its officers&apos; duty hours (Admin →
          Officers → Availability schedule), the weekly timetable appears here
          with a live &ldquo;available now&rdquo; view.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-line bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
            Weekly availability
          </p>
          <h2 className="mt-1.5 font-display text-xl font-extrabold tracking-tight text-snow sm:text-2xl">
            When you can find each officer
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-mist">
            Rebuilt from the published <span className="font-semibold text-snow">{EO_SCHEDULE.heading}</span>{" "}
            ({EO_SCHEDULE.title}). Green = no scheduled class, red = in class,
            lunch is reserved for everyone.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-3 py-1.5 text-[11px] font-bold text-ok">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
            Free now
            <span className="tnum">{freeNow.length}</span>
          </span>
          {isToday && (
            <button
              type="button"
              aria-pressed={freeNowOnly}
              onClick={() => setFreeNowOnly((value) => !value)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors duration-200 press ${
                freeNowOnly
                  ? "border-vio-500 bg-vio-950 text-vio-200"
                  : "border-line bg-night/60 text-mist hover:text-snow"
              }`}
            >
              <IconClock size={13} />
              {freeNowOnly ? "Showing free now" : "Show only free now"}
            </button>
          )}
        </div>
      </div>

      {/* Day tabs — the order prints one table per day. */}
      <div
        role="group"
        aria-label="Choose a day"
        className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-line bg-night/40 p-1.5"
      >
        {EO_DAYS.map((name) => {
          const active = day === name;
          const today = todayName(now) === name;
          const count = withHours.filter((officer) =>
            slotsFor(officer.id, name).length > 0,
          ).length;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setDay(name);
                setFreeNowOnly(false);
              }}
              className={`inline-flex min-h-10 grow items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-bold uppercase tracking-[0.06em] transition-colors duration-200 press ${
                active
                  ? "border border-vio-500 bg-vio-950 text-vio-200"
                  : "border border-transparent text-mist hover:text-snow"
              }`}
            >
              {name}
              {today && (
                <span className="rounded-full bg-ok/20 px-1.5 py-0.5 text-[9px] font-bold text-ok">
                  TODAY
                </span>
              )}
              <span className="tnum text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {EO_SCHEDULE.dayNotes[day] && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-night/40 px-4 py-3 text-xs leading-relaxed text-mist">
          <IconPin size={14} className="mt-0.5 shrink-0 text-dim" />
          <span>
            <span className="font-bold text-snow">{day}: </span>
            {EO_SCHEDULE.dayNotes[day]}
          </span>
        </p>
      )}

      {freeNowOnly && freeNow.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-night/40 px-4 py-3 text-xs text-mist">
          Nobody has a published free block right now
          {inLunch ? " — it is the lunch break." : "."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr>
                <th className="sticky start-0 z-10 bg-panel px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
                  Time
                </th>
                {columns.map((officer) => {
                  const { position, program } = splitPosition(officer);
                  return (
                    <th key={officer.id} className="px-1.5 pb-2 align-bottom">
                      <button
                        type="button"
                        onClick={() => onPickOfficer?.(officer.id)}
                        className="group w-full rounded-lg px-1.5 py-1 text-left transition-colors duration-200 hover:bg-panel-2 press"
                        title={`Open ${officer.name}'s card`}
                      >
                        <span className="block text-[11px] font-bold text-snow">
                          {officer.name.split(" ")[0]}{" "}
                          {officer.name.split(" ").slice(-1)[0]}
                        </span>
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-dim">
                          {program ? `${position} · ${program}` : position}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-vio-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          View card
                          <IconArrowRight size={10} />
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
                return (
                  <tr
                    key={minutes}
                    className={isNowSlot ? "outline outline-1 outline-vio-500/60" : ""}
                  >
                    <td
                      className={`sticky start-0 z-10 whitespace-nowrap px-2 py-1 text-[11px] font-semibold ${
                        isNowSlot ? "bg-vio-950/70 text-vio-200" : "bg-panel text-dim"
                      }`}
                    >
                      {hourLabel(minutes)}
                    </td>
                    {columns.map((officer) => {
                      const hasHours = slotsFor(officer.id, day).length > 0;
                      const free = isFreeAt(officer.id, day, minutes);
                      return (
                        <td key={officer.id} className="px-1.5 py-1">
                          <span
                            className={`flex min-h-9 items-center justify-center rounded-lg border px-2 text-[10px] font-bold uppercase tracking-[0.08em] ${
                              !hasHours
                                ? "border-line bg-night/40 text-dim"
                                : free
                                  ? "border-ok/40 bg-ok/15 text-ok"
                                  : "border-bad/30 bg-bad/10 text-bad/90"
                            }`}
                            title={`${officer.name} · ${day} ${hourLabel(minutes)}`}
                          >
                            {!hasHours
                              ? "—"
                              : free
                                ? "Available"
                                : "In class"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr>
                <td className="sticky start-0 z-10 bg-panel px-2 py-1 text-[11px] font-semibold text-dim">
                  {formatTime(LUNCH_START)}
                </td>
                <td colSpan={columns.length} className="px-1.5 py-1">
                  <span className="flex min-h-9 items-center justify-center rounded-lg border border-line bg-panel-2/60 text-[10px] font-bold uppercase tracking-[0.16em] text-mist">
                    Lunch break
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded border border-ok/40 bg-ok/15" />
          No scheduled class
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded border border-bad/30 bg-bad/10" />
          In class
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded border border-line bg-night/40" />
          No hours published for that day
        </span>
      </p>

      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        {EO_SCHEDULE.provenance} {EO_SCHEDULE.grid.start.slice(0, 2)}:00–
        {EO_SCHEDULE.grid.end.slice(0, 2)}:00, {EO_SCHEDULE.term}. Availability
        means no published class — it does not guarantee the officer is at the
        office. For official matters, message the council page first.
      </p>
    </div>
  );
}
