"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  IconArrowRight,
  IconBell,
  IconChart,
  IconClock,
  IconCoins,
  IconDoor,
  IconExternal,
  IconFile,
  IconFolder,
  IconList,
  IconPin,
  IconSearch,
  IconShield,
  IconSparkle,
  IconUsers,
} from "@/components/Icons";
import { btnAdmin, btnGhostAdmin, Card } from "@/components/admin/Ui";

/**
 * Interactive admin dashboard board — the buttons that actually do something.
 *
 * Three things live here, all client-side on data the server already sent:
 *
 *  1. Quick actions — one click to the page (or straight to the form) for the
 *     jobs an admin does most, plus the two "refresh" jobs that are a single
 *     server call (Constituency and Roomivility) with a real pending state.
 *  2. A live filter + pin board for the admin sections. Pinned sections are
 *     remembered in localStorage, so each account gets its own shortcut row.
 *  3. Copy-link buttons for the public pages, so a link can be shared without
 *     leaving the panel.
 */

export type DashboardSection = {
  href: string;
  label: string;
  description: string;
};

export type QuickAction = {
  href: string;
  label: string;
  /** Admin page that opens the matching form. */
  hint: string;
  icon: "file" | "folder" | "users" | "coins" | "chart" | "bell" | "door" | "shield" | "list";
};

export const quickActionIcons = {
  file: IconFile,
  folder: IconFolder,
  users: IconUsers,
  coins: IconCoins,
  chart: IconChart,
  bell: IconBell,
  door: IconDoor,
  shield: IconShield,
  list: IconList,
} as const;

const PIN_KEY = "rcloud.admin.dashboard.pins.v1";

function readPins(): string[] {
  try {
    const raw = window.localStorage.getItem(PIN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Submit button that reflects the server action's real pending state. */
function ActionButton({
  children,
  pendingLabel,
  disabled = false,
  tone = "primary",
}: {
  children: ReactNode;
  pendingLabel: string;
  disabled?: boolean;
  tone?: "primary" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${tone === "primary" ? btnAdmin : btnGhostAdmin} disabled:opacity-50`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export default function DashboardBoard({
  sections,
  quickActions,
  publicLinks,
  refreshConstituency,
  refreshRoomfinder,
  roomfinderReady,
}: {
  sections: DashboardSection[];
  quickActions: QuickAction[];
  publicLinks: Array<{ href: string; label: string }>;
  /** Server actions — the only buttons here that change data. */
  refreshConstituency?: (form: FormData) => Promise<void>;
  refreshRoomfinder?: (form: FormData) => Promise<void>;
  /** False when no Sheet link has been saved yet, so the button says why. */
  roomfinderReady?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pins, setPins] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Pins are per-browser convenience only — nothing is written to the server.
  // Read after paint (microtask) so the first render matches the server HTML.
  useEffect(() => {
    Promise.resolve().then(() => setPins(readPins()));
  }, []);

  function togglePin(href: string) {
    setPins((current) => {
      const next = current.includes(href)
        ? current.filter((value) => value !== href)
        : [...current, href];
      try {
        window.localStorage.setItem(PIN_KEY, JSON.stringify(next));
      } catch {
        // Private mode — pins simply do not persist.
      }
      return next;
    });
  }

  const filtered = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return sections;
    return sections.filter((section) => {
      const haystack = `${section.label} ${section.description}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [sections, query]);

  const pinned = useMemo(
    () =>
      pins
        .map((href) => sections.find((section) => section.href === href))
        .filter((section): section is DashboardSection => Boolean(section)),
    [pins, sections],
  );

  async function copyLink(href: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
      setCopied(href);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* --------------------------- Quick actions -------------------------- */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-snow">
              Quick actions
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-mist">
              The jobs you reach for most — each one opens the matching form, or
              runs the refresh in place. Only your role&apos;s buttons are listed.
            </p>
          </div>
          {publicLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {publicLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => copyLink(link.href)}
                  className={btnGhostAdmin}
                  title={`Copy the public URL of ${link.href}`}
                >
                  {copied === link.href ? "Copied!" : `Copy ${link.label} link`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = quickActionIcons[action.icon];
            return (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className="group flex items-start gap-3 rounded-xl border border-line bg-night/40 p-4 transition-colors duration-200 hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 press"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-2 text-vio-300 transition-colors duration-200 group-hover:text-vio-200">
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold text-snow">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-mist">
                    {action.hint}
                  </span>
                </span>
                <IconArrowRight
                  size={15}
                  className="ms-auto shrink-0 text-vio-300 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            );
          })}

          {/* One-click refreshes — real server work, real pending state. */}
          {refreshConstituency && (
            <form
              action={refreshConstituency}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-night/40 p-4"
            >
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold text-snow">
                  Refresh constituency data
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-mist">
                  Re-reads the Google Sheet now instead of waiting for the next
                  manual visit.
                </span>
              </span>
              <ActionButton pendingLabel="Refreshing…">
                <IconChart size={15} />
                Run
              </ActionButton>
            </form>
          )}

          {refreshRoomfinder && (
            <form
              action={refreshRoomfinder}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-night/40 p-4"
            >
              <span className="min-w-0">
                <span className="block font-display text-sm font-bold text-snow">
                  Refresh room schedule
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-mist">
                  {roomfinderReady
                    ? "Pulls the Roomivility Sheet again and replaces the stored entries."
                    : "Save a Sheet link first, or upload a file on the Roomivility page."}
                </span>
              </span>
              <ActionButton
                pendingLabel="Refreshing…"
                disabled={!roomfinderReady}
                tone="ghost"
              >
                <IconDoor size={15} />
                Run
              </ActionButton>
            </form>
          )}
        </div>
      </Card>

      {/* ------------------------- Section navigator ------------------------ */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-snow">
              Admin sections
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-mist">
              Filter the list, or pin the sections you open every day — pins are
              kept in this browser only.
            </p>
          </div>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Filter admin sections</span>
            <IconSearch
              size={16}
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-dim"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter sections…"
              className="h-10 w-full rounded-xl border border-line bg-night/60 ps-10 pe-3 text-sm text-snow placeholder:text-dim focus:border-vio-500 focus:outline-none"
            />
          </label>
        </div>

        {pinned.length > 0 && query === "" && (
          <div className="mt-4 rounded-xl border border-vio-600/40 bg-vio-950/25 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-vio-300">
              <IconSparkle size={12} />
              Pinned
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pinned.map((section) => (
                <span key={section.href} className="inline-flex items-center gap-1">
                  <Link
                    href={section.href}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-vio-500/50 bg-night/60 px-3.5 text-xs font-bold text-vio-200 transition-colors duration-200 hover:border-vio-400 active:bg-vio-950 press"
                  >
                    {section.label}
                    <IconArrowRight size={13} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => togglePin(section.href)}
                    title={`Unpin ${section.label}`}
                    className="rounded-full px-1.5 text-[11px] font-bold text-dim transition-colors duration-200 hover:text-snow"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((section) => {
            const isPinned = pins.includes(section.href);
            return (
              <div
                key={section.href}
                className="group relative flex flex-col gap-1.5 rounded-xl border border-line bg-night/40 p-4 transition-colors duration-200 hover:border-vio-600/60 hover:bg-panel-2"
              >
                <Link href={section.href} className="flex flex-col gap-1.5 pr-8">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-snow">
                      {section.label}
                    </span>
                    <IconArrowRight
                      size={15}
                      className="shrink-0 text-vio-300 transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="text-xs leading-relaxed text-mist">
                    {section.description}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => togglePin(section.href)}
                  aria-pressed={isPinned}
                  title={isPinned ? `Unpin ${section.label}` : `Pin ${section.label}`}
                  className={`absolute end-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors duration-200 press ${
                    isPinned
                      ? "border-vio-500 bg-vio-950 text-vio-200"
                      : "border-line bg-panel text-dim hover:text-snow"
                  }`}
                >
                  <IconPin size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="mt-4 text-sm text-mist">
            No section matches “{query.trim()}”.
          </p>
        )}

        {publicLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              Public pages
            </span>
            {publicLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3.5 text-xs font-semibold text-mist transition-colors duration-200 hover:border-line-2 hover:text-snow press"
              >
                {link.label}
                <IconExternal size={12} />
              </a>
            ))}
            <span className="ms-auto flex items-center gap-1.5 text-[11px] text-dim">
              <IconClock size={12} />
              Tip: pin the sections you use daily
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
