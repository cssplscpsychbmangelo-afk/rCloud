import type { ReactNode } from "react";
import type { ProjectStatus } from "@/lib/types";

/* ------------------------------ Button styles -----------------------------
   Shared so every CTA behaves the same: ≥44px hit area, tactile press,
   visible active (touch) feedback, full-width on mobile. */

export const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 press max-sm:w-full";

export const btnPrimary = `${btn} bg-vio-500 text-snow shadow-[0_8px_28px_oklch(0.54_0.22_295/0.35)] hover:bg-vio-400 active:bg-vio-600`;

export const btnGhost = `${btn} border border-line bg-panel text-snow hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 active:bg-vio-950`;

export const btnGhostSm =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-vio-300 transition-all duration-200 hover:border-vio-600/60 hover:text-vio-200 active:border-vio-500 active:bg-vio-950 press max-sm:w-full";

/* ------------------------------ Section header ---------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-snow sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-mist">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------- Status badge ----------------------------- */

const statusStyles: Record<ProjectStatus, string> = {
  Pending: "border-pend/30 bg-pend/10 text-pend",
  Ongoing: "border-vio-400/40 bg-vio-500/15 text-vio-300",
  Completed: "border-ok/30 bg-ok/10 text-ok",
  Cancelled: "border-bad/30 bg-bad/10 text-bad",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

/* ------------------------------- Category chip ---------------------------- */

export function CategoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-panel-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist">
      {label}
    </span>
  );
}
