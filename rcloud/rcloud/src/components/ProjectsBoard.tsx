"use client";

import { useMemo, useState } from "react";
import { ProjectCard } from "./Cards";
import { StatusBadge } from "./Primitives";
import { monthKey, monthLabel } from "@/lib/format";
import type { Project } from "@/lib/types";

/**
 * Month-based project limiter.
 * - "This month" projects render as full cards (featured, as-is).
 * - Past months are collapsed behind month buttons and listed minimally.
 * Only the selected month is rendered — keeps the page light.
 */
export default function ProjectsBoard({ projects }: { projects: Project[] }) {
  const currentKey = monthKey(new Date());

  const byMonth = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const project of projects) {
      const key = project.date ? monthKey(new Date(project.date)) : currentKey;
      const list = map.get(key) ?? [];
      list.push(project);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [projects, currentKey]);

  const keys = byMonth.map(([key]) => key);
  const [selected, setSelected] = useState<string>(
    () => (keys.includes(currentKey) ? currentKey : keys[0] ?? currentKey),
  );

  const selectedProjects =
    byMonth.find(([key]) => key === selected)?.[1] ?? [];
  const isCurrent = selected === currentKey;

  return (
    <div className="mt-8">
      {/* Month buttons */}
      <div role="group" aria-label="Browse projects by month" className="flex flex-wrap gap-2">
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
                  ? "border-vio-500 bg-vio-950 text-vio-200"
                  : "border-line bg-panel text-mist hover:border-line-2 hover:text-snow active:border-vio-500"
              }`}
            >
              {key === currentKey ? "This month" : monthLabel(key)}
              <span className={`tnum ms-2 text-[10px] ${active ? "text-vio-300" : "text-dim"}`}>
                {list.length}
              </span>
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="tnum mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-dim"
      >
        {isCurrent ? "Featured this month" : monthLabel(selected)} · {selectedProjects.length}{" "}
        project{selectedProjects.length === 1 ? "" : "s"}
      </p>

      {selectedProjects.length === 0 ? (
        <div className="mt-4 rounded-[20px] border border-line bg-panel px-6 py-12 text-center">
          <p className="font-display text-base font-bold text-snow">
            No projects this month
          </p>
          <p className="mt-2 text-sm text-mist">Pick another month above.</p>
        </div>
      ) : isCurrent ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selectedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-[20px] border border-line bg-panel">
          {selectedProjects.map((project) => (
            <li key={project.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <span className="font-display text-sm font-bold text-snow">
                {project.name}
              </span>
              <StatusBadge status={project.status} />
              {project.date && (
                <time
                  dateTime={project.date}
                  className="tnum text-xs text-dim"
                >
                  {new Date(project.date).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
