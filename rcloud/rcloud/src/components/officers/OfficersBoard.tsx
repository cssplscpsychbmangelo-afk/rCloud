"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Officer, OfficerAvailability } from "@/lib/types";
import {
  collectPrograms,
  describeFilters,
  hasProgram,
  isSlotLive,
  liveSlot,
  selectOfficers,
  splitPosition,
  type OfficerScope,
  type OfficerSort,
} from "@/lib/officers";
import { initialsOf } from "@/lib/format";
import { formatRange } from "@/lib/roomfinder";
import { slotLabel } from "@/lib/officers";
import {
  IconArrowRight,
  IconClose,
  IconClock,
  IconSearch,
  IconSparkle,
  IconUsers,
} from "@/components/Icons";
import { btnGhostSm } from "@/components/Primitives";

/**
 * Officers board — the interactive version of the roster.
 *
 * Everything runs in the browser on the roster the server already sent: search
 * by name / position / program, scope chips (all, executive posts, program
 * representatives), a program chip row built from the records themselves,
 * council-order vs A–Z sorting, and expandable cards that reveal the full
 * record. Nothing is fetched per interaction and nothing is inferred — the
 * chips only ever contain values that exist in the roster.
 *
 * A card can be deep-linked (`/officers?officer=<id>`) and the address is kept
 * in sync, so a specific officer can be shared — the same idea as the Room
 * Finder's `?room=` links.
 */

const chip =
  "inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-bold transition-colors duration-200 press";
const chipOn = "border-vio-500 bg-vio-950 text-vio-200";
const chipOff =
  "border-line bg-panel text-mist hover:border-line-2 hover:text-snow active:bg-vio-950";

export default function OfficersBoard({
  officers,
  availability = [],
  openId,
  onOpenChange,
}: {
  officers: Officer[];
  /** Published duty / consultation hours — nothing is shown when there are none. */
  availability?: OfficerAvailability[];
  /** Expanded card, owned by the section so the timetable can open one too. */
  openId: string | null;
  onOpenChange: (officerId: string | null) => void;
}) {
  const programs = useMemo(() => collectPrograms(officers), [officers]);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<OfficerScope>("all");
  const [program, setProgram] = useState<string | null>(null);
  const [sort, setSort] = useState<OfficerSort>("order");
  const [onlyOnDuty, setOnlyOnDuty] = useState(false);
  /** Local clock, ticked every 30 s — duty status never asks a server. */
  const [now, setNow] = useState(() => new Date());

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const slotsFor = useCallback(
    (officerId: string) => availability.filter((slot) => slot.officerId === officerId),
    [availability],
  );
  const onDutyCount = useMemo(
    () =>
      officers.filter((officer) => liveSlot(slotsFor(officer.id), now) !== null)
        .length,
    [officers, slotsFor, now],
  );

  // A deep-linked card is scrolled into view (no state writes here).
  useEffect(() => {
    if (!openId || !officers.some((officer) => officer.id === openId)) return;
    const target = openId;
    const timer = window.setTimeout(() => {
      cardRefs.current[target]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [openId, officers]);

  const filters = { query, scope, program, sort };
  const visible = useMemo(() => {
    const selected = selectOfficers(officers, { query, scope, program, sort });
    return onlyOnDuty
      ? selected.filter((officer) => liveSlot(slotsFor(officer.id), now) !== null)
      : selected;
  }, [officers, query, scope, program, sort, onlyOnDuty, slotsFor, now]);
  const activeLabel = describeFilters(filters, programs);
  const filtering =
    query.trim() !== "" ||
    scope !== "all" ||
    program !== null ||
    sort !== "order" ||
    onlyOnDuty;

  const reset = useCallback(() => {
    setQuery("");
    setScope("all");
    setProgram(null);
    setSort("order");
    setOnlyOnDuty(false);
    onOpenChange(null);
  }, [onOpenChange]);

  const toggleProgram = useCallback((value: string) => {
    setProgram((current) => (current === value ? null : value));
  }, []);

  /** Copies a shareable link to one officer, without leaving the page. */
  async function copyOfficerLink(officer: Officer) {
    const shareable = `${window.location.origin}${window.location.pathname}?officer=${officer.id}`;
    try {
      await navigator.clipboard.writeText(shareable);
      setCopiedId(officer.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard blocked (older browser / insecure context) — the link is
      // still in the address bar once the card is open, so say nothing wrong.
      setCopiedId(null);
    }
  }

  return (
    <div>
      {/* ------------------------------ Toolbar ---------------------------- */}
      <div className="rounded-[20px] border border-line bg-panel p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">Search officers by name, position or program</span>
          <IconSearch
            size={18}
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search officers — name, position or program…"
            className="h-12 w-full rounded-2xl border border-line bg-night/60 ps-11 pe-12 text-sm text-snow placeholder:text-dim transition-colors duration-200 focus:border-vio-500 focus:outline-none"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-bold text-dim transition-colors duration-200 hover:text-snow"
            >
              Clear
            </button>
          )}
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter officers">
          <button
            type="button"
            aria-pressed={scope === "all"}
            onClick={() => setScope("all")}
            className={`${chip} ${scope === "all" ? chipOn : chipOff}`}
          >
            <IconUsers size={14} />
            All officers
            <span className="tnum text-[11px] opacity-70">{officers.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={scope === "exec"}
            onClick={() => setScope("exec")}
            className={`${chip} ${scope === "exec" ? chipOn : chipOff}`}
          >
            Executive posts
          </button>
          <button
            type="button"
            aria-pressed={scope === "board"}
            onClick={() => setScope("board")}
            className={`${chip} ${scope === "board" ? chipOn : chipOff}`}
          >
            Program representatives
            <span className="tnum text-[11px] opacity-70">
              {officers.filter(hasProgram).length}
            </span>
          </button>

          <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />

          {availability.length > 0 && (
            <button
              type="button"
              aria-pressed={onlyOnDuty}
              onClick={() => setOnlyOnDuty((current) => !current)}
              className={`${chip} ${onlyOnDuty ? "border-ok/50 bg-ok/10 text-ok" : chipOff}`}
              title="Officers inside a published duty block right now"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
              On duty now
              <span className="tnum text-[11px] opacity-80">{onDutyCount}</span>
            </button>
          )}

          <button
            type="button"
            aria-pressed={sort === "az"}
            onClick={() => setSort((current) => (current === "az" ? "order" : "az"))}
            className={`${chip} ${sort === "az" ? chipOn : chipOff}`}
            title="Switch between council order and A–Z"
          >
            {sort === "az" ? "A–Z" : "Council order"}
          </button>
        </div>

        {programs.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by program">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              Program
            </span>
            {programs.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={program === value}
                onClick={() => toggleProgram(value)}
                className={`${chip} ${program === value ? chipOn : chipOff}`}
              >
                {value}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-mist" aria-live="polite">
            Showing <span className="tnum font-bold text-snow">{visible.length}</span>{" "}
            of {officers.length} officer{officers.length === 1 ? "" : "s"}
            {activeLabel ? <span className="text-dim"> · {activeLabel}</span> : null}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-vio-300 transition-colors duration-200 hover:text-vio-200"
            >
              <IconClose size={13} />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------- Roster ---------------------------- */}
      {visible.length === 0 ? (
        <div className="mt-6 rounded-[20px] border border-line bg-panel px-6 py-12 text-center">
          <p className="font-display text-base font-bold text-snow">
            No officer matches those filters.
          </p>
          <p className="mt-2 text-sm text-mist">
            Try a different name, program or search term.
          </p>
          <button type="button" onClick={reset} className={`${btnGhostSm} mt-5`}>
            Show every officer
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((officer) => {
            const { position, program: officerProgram } = splitPosition(officer);
            const open = openId === officer.id;
            const slots = slotsFor(officer.id);
            const live = liveSlot(slots, now);
            return (
              <div
                key={officer.id}
                id={`officer-${officer.id}`}
                ref={(node) => {
                  cardRefs.current[officer.id] = node;
                }}
                className={`flex h-full flex-col rounded-[20px] border bg-panel transition-colors duration-200 ${
                  open
                    ? "border-vio-600/70 bg-panel-2"
                    : "border-line hover:border-vio-600/60"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onOpenChange(open ? null : officer.id)}
                  className="flex grow items-center gap-4 rounded-[20px] p-5 text-left transition-colors duration-200 active:bg-vio-950/60 press sm:flex-col sm:items-center sm:gap-5 sm:p-6 sm:text-center"
                >
                  {officer.photoUrl ? (
                    <Image
                      src={officer.photoUrl}
                      alt={`Official photo of ${officer.name}`}
                      width={96}
                      height={96}
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-vio-600/50 outline outline-1 outline-white/10 sm:h-24 sm:w-24"
                    />
                  ) : (
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-vio-600/40 bg-gradient-to-b from-vio-950 to-panel-2 font-display text-base font-extrabold text-vio-300 outline outline-1 outline-white/10 sm:h-24 sm:w-24 sm:text-2xl"
                      aria-hidden
                    >
                      {initialsOf(officer.name)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-bold text-snow sm:text-base">
                      {officer.name}
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-vio-300 sm:text-xs sm:tracking-[0.14em]">
                      {position}
                    </span>
                    {officerProgram && (
                      <span className="mt-1.5 inline-flex items-center rounded-full border border-line bg-panel-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist">
                        {officerProgram}
                      </span>
                    )}
                    {live && (
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-ok/40 bg-ok/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ok">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
                        On duty now
                      </span>
                    )}
                    <span className="mt-2 block text-[11px] font-semibold text-dim">
                      {open ? "Hide details" : "View details"}
                      <IconArrowRight
                        size={12}
                        className={`ms-1 inline-block transition-transform duration-200 ${
                          open ? "rotate-90" : ""
                        }`}
                      />
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="border-t border-line px-5 pb-5 pt-4 sm:px-6">
                    {officer.description ? (
                      <p className="text-sm leading-relaxed text-mist">
                        {officer.description}
                      </p>
                    ) : (
                      <p className="text-sm leading-relaxed text-dim">
                        No description published for this officer yet.
                      </p>
                    )}

                    {slots.length > 0 && (
                      <div className="mt-4 rounded-xl border border-line bg-night/40 p-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
                          <IconSparkle size={12} className="text-vio-300" />
                          Availability schedule
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {slots.map((slot) => (
                            <li
                              key={slot.id}
                              className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg px-2 py-1 text-xs ${
                                isSlotLive(slot, now)
                                  ? "bg-ok/10 text-snow ring-1 ring-ok/30"
                                  : "text-mist"
                              }`}
                            >
                              <span className="font-semibold text-snow">
                                {slotLabel(slot)}
                              </span>
                              <span className="tnum text-vio-300">
                                {formatRange(slot.start, slot.end)}
                              </span>
                              {slot.location && <span>· {slot.location}</span>}
                              {slot.note && (
                                <span className="w-full text-[11px] text-dim">
                                  {slot.note}
                                </span>
                              )}
                              {isSlotLive(slot, now) && (
                                <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ok">
                                  <IconClock size={11} />
                                  now
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyOfficerLink(officer)}
                        className={btnGhostSm}
                      >
                        {copiedId === officer.id ? "Link copied" : "Copy link to this officer"}
                      </button>
                      <a href="#officers-top" className={btnGhostSm}>
                        Back to top
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
