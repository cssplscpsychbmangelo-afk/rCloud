"use client";

import { useMemo, useState } from "react";
import type { Resource } from "@/lib/types";
import { ResourceCard } from "./Cards";
import { IconSearch } from "./Icons";

/** Searchable, filterable repository of every rCloud resource (DB-fed). */
export default function ResourceSearch({ resources }: { resources: Resource[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(resources.map((r) => r.category)))],
    [resources],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((resource) => {
      const inCategory = category === "All" || resource.category === category;
      if (!inCategory) return false;
      if (!q) return true;
      const haystack = [resource.title, resource.description, ...resource.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category, resources]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">Search resources</span>
          <IconSearch
            size={18}
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents, reports, directories…"
            className="h-12 w-full rounded-2xl border border-line bg-panel ps-11 pe-4 text-sm text-snow placeholder:text-dim transition-colors duration-200 focus:border-vio-500 focus:outline-none"
          />
        </label>

        <div
          role="group"
          aria-label="Filter by category"
          className="flex flex-wrap gap-2"
        >
          {categories.map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={active}
                className={`min-h-10 rounded-full border px-4 py-2 text-xs font-semibold transition-colors duration-200 press ${
                  active
                    ? "border-vio-500 bg-vio-950 text-vio-200"
                    : "border-line bg-panel text-mist hover:border-line-2 hover:text-snow"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result meta */}
      <p
        className="tnum mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-dim"
        aria-live="polite"
      >
        {filtered.length} of {resources.length} resources
      </p>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] border border-line bg-panel px-6 py-12 text-center">
          <p className="font-display text-base font-bold text-snow">
            No resources match &ldquo;{query}&rdquo;
          </p>
          <p className="mt-2 text-sm text-mist">
            Try a different term, or clear the search to browse everything.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
            }}
            className="mt-5 min-h-11 rounded-xl border border-vio-500 bg-vio-950 px-5 py-2.5 text-sm font-semibold text-vio-200 transition-colors duration-200 hover:bg-vio-700/40 press"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
