"use client";

import { useMemo, useState } from "react";
import { ProjectCard } from "./Cards";
import type { Project, ProjectStatus } from "@/lib/types";

const filters: Array<ProjectStatus | "All"> = [
  "All",
  "Pending",
  "Ongoing",
  "Completed",
  "Cancelled",
];

/** Project tracker with working status filter buttons (DB-fed). */
export default function ProjectsBoard({ projects }: { projects: Project[] }) {
  const [status, setStatus] = useState<(typeof filters)[number]>("All");

  const filtered = useMemo(
    () =>
      status === "All"
        ? projects
        : projects.filter((project) => project.status === status),
    [status, projects],
  );

  const countOf = (filter: (typeof filters)[number]) =>
    filter === "All"
      ? projects.length
      : projects.filter((project) => project.status === filter).length;

  return (
    <div className="mt-8">
      {/* Status filter buttons */}
      <div
        role="group"
        aria-label="Filter projects by status"
        className="flex flex-wrap gap-2"
      >
        {filters.map((filter) => {
          const active = status === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setStatus(filter)}
              aria-pressed={active}
              className={`min-h-11 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 press ${
                active
                  ? "border-vio-500 bg-vio-950 text-vio-200"
                  : "border-line bg-panel text-mist hover:border-line-2 hover:text-snow active:border-vio-500"
              }`}
            >
              {filter}
              <span
                className={`tnum ms-2 text-[10px] ${active ? "text-vio-300" : "text-dim"}`}
              >
                {countOf(filter)}
              </span>
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="tnum mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-dim"
      >
        {filtered.length} of {projects.length} projects
      </p>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-line bg-panel px-6 py-12 text-center">
          <p className="font-display text-base font-bold text-snow">
            No {status.toLowerCase()} projects right now
          </p>
          <p className="mt-2 text-sm text-mist">
            Check the other statuses, or view all projects.
          </p>
        </div>
      )}
    </div>
  );
}
