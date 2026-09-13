import Image from "next/image";
import type {
  Officer,
  Project,
  Resource,
} from "@/lib/types";
import { formatNumber, formatPeso, initialsOf, percentOf } from "@/lib/format";
import { CategoryChip, StatusBadge } from "./Primitives";
import ProgressBar from "./ProgressBar";
import {
  IconArrowRight,
  IconExternal,
  ResourceIcon,
  IconShield,
  IconWaves,
  IconWifiOff,
} from "./Icons";

/* ------------------------------- Resource card ---------------------------- */

export function ResourceCard({ resource }: { resource: Resource }) {
  const external = !resource.internal;
  return (
    <a
      href={resource.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group flex h-full flex-col gap-4 rounded-[20px] border border-line bg-panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 active:bg-vio-950/60 press"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2 text-vio-300 transition-colors duration-200 group-hover:text-vio-200">
          <ResourceIcon name={resource.icon} size={20} />
        </span>
        <CategoryChip label={resource.category} />
      </div>
      <div className="grow">
        <h3 className="font-display text-base font-bold text-snow">
          {resource.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-mist">
          {resource.description}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-vio-300">
        {external ? "Open resource" : "View on rCloud"}
        {external ? (
          <IconExternal
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        ) : (
          <IconArrowRight
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        )}
      </span>
    </a>
  );
}

/* ------------------------------- Officer card ----------------------------- */

export function OfficerCard({ officer }: { officer: Officer }) {
  return (
    <div
      tabIndex={0}
      className="flex h-full items-center gap-4 rounded-[20px] border border-line bg-panel p-5 text-left transition-all duration-200 hover:border-vio-600/60 hover:bg-panel-2 focus-visible:border-vio-500 active:border-vio-500 active:bg-vio-950/60 press sm:flex-col sm:items-center sm:gap-5 sm:p-6 sm:text-center"
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
        <div
          role="img"
          aria-label={`Placeholder portrait for ${officer.name}`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-vio-600/40 bg-gradient-to-b from-vio-950 to-panel-2 font-display text-base font-extrabold text-vio-300 outline outline-1 outline-white/10 sm:h-24 sm:w-24 sm:text-2xl"
        >
          {initialsOf(officer.name)}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="font-display text-sm font-bold text-snow sm:text-base">
          {officer.name}
        </h3>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-vio-300 sm:text-xs sm:tracking-[0.14em]">
          {officer.position}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- Project card ----------------------------- */

/** Public cards show project-level totals only — never individual expenses. */
export function ProjectCard({ project }: { project: Project }) {
  const remaining = project.approvedBudget - project.actualExpenditure;
  // Only external http(s) links become a button — no link, no button.
  const photoLink =
    project.imageUrl && /^https?:\/\//i.test(project.imageUrl)
      ? project.imageUrl
      : null;
  return (
    <article className="flex h-full flex-col gap-4 rounded-[20px] border border-line bg-panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-vio-600/60">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-bold text-snow">
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-sm leading-relaxed text-mist">{project.description}</p>

      {photoLink && (
        <a
          href={photoLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg border border-line bg-panel-2 px-3.5 text-xs font-semibold text-vio-300 transition-colors duration-200 hover:border-vio-600/60 hover:bg-vio-950/60 hover:text-vio-200 active:border-vio-500 press"
        >
          View photo
          <IconExternal size={13} />
        </a>
      )}

      <div className="mt-auto space-y-3 pt-2">
        <ProgressBar
          value={project.actualExpenditure}
          max={project.approvedBudget}
          label={`${project.name}: ${percentOf(project.actualExpenditure, project.approvedBudget)}% of budget utilized`}
        />
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Approved", formatPeso(project.approvedBudget)],
            ["Utilized", formatPeso(project.actualExpenditure)],
            ["Remaining", formatPeso(remaining)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-line bg-panel-2 px-2 py-2"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
                {label}
              </dt>
              <dd className="tnum mt-1 text-xs font-bold text-snow">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}

/* ------------------------------- Stat card -------------------------------- */

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[20px] border border-line bg-panel p-5 transition-colors duration-200 hover:border-line-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-dim">
        {label}
      </p>
      <p className="tnum mt-3 font-display text-2xl font-extrabold tracking-tight text-snow sm:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-mist">{hint}</p>}
    </div>
  );
}

