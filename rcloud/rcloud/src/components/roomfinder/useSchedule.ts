"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  sanitizeDataset,
  type ScheduleDataset,
} from "@/lib/roomfinder";

/**
 * Loads the schedule dataset exactly ONCE per visit and keeps it in browser
 * memory (and localStorage as an offline copy). All searching, filtering and
 * availability math then runs client-side — no request is ever made for a
 * search, filter or room lookup.
 *
 * Network model: one small fetch → everything local afterwards.
 * Tries the live API (/api/roomfinder/schedule) first (DB-synced sheet),
 * falls back to the static placeholder JSON (/data/cssp-schedule.json).
 * If the refresh fails but a cached copy exists, the room finder keeps
 * working with the most recently loaded schedule (clearly labelled).
 *
 * PLACEHOLDERS ARE RETIRED BY A REAL UPLOAD.
 * The server tells this hook whether the council already has its own schedule
 * (`placeholders: false`, from getRoomfinderSource()). In that mode:
 *   - the bundled placeholder file is never fetched,
 *   - any placeholder copy still sitting in this browser's cache is discarded,
 *   - a network failure shows an honest "could not be loaded" state (or the
 *     cached *real* schedule) instead of sample rooms pretending to be real.
 * So once a Sheet is synced or a file is uploaded, the placeholders disappear
 * from the site — they only come back after "Clear & use placeholders".
 */

const API_URL = "/api/roomfinder/schedule";
const DATA_URL = "/data/cssp-schedule.json";
const CACHE_KEY = "rcloud.roomfinder.schedule.v1";

/** Where a dataset came from — the admin's own upload, or the bundled sample. */
export type ScheduleSource = "live" | "placeholder";

export interface ScheduleOptions {
  /** False once the council has its own schedule — kills the placeholders. */
  placeholders?: boolean;
  /** Last-sync stamp from the server; changes bust the CDN cache per sync. */
  version?: string;
}

export interface ScheduleState {
  data: ScheduleDataset | null;
  /** "loading" → first fetch in flight, nothing cached. */
  /** "ready" → dataset in memory (fresh or cached). */
  /** "error" → fetch failed and nothing was ever cached. */
  status: "loading" | "ready" | "error";
  /** True when showing the locally cached copy because the refresh failed. */
  offline: boolean;
  /** True when using the placeholder static file (no custom sheet yet). */
  isPlaceholder: boolean;
  retry: () => void;
}

interface CachePayload {
  savedAt: string;
  source: ScheduleSource;
  data: ScheduleDataset;
}

function clearCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // Private mode / storage disabled — nothing cached anyway.
  }
}

/**
 * Reads the cached copy, but only one that is still allowed:
 * a placeholder copy is refused (and deleted) when the council has its own
 * schedule, so a sample schedule can never survive an upload in a returning
 * visitor's browser.
 */
function readCache(allowPlaceholder: boolean): CachePayload | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachePayload>;
    const source: ScheduleSource =
      parsed.source === "placeholder" ? "placeholder" : "live";
    if (source === "placeholder" && !allowPlaceholder) {
      clearCache();
      return null;
    }
    const clean = sanitizeDataset(parsed.data);
    return clean
      ? { savedAt: String(parsed.savedAt ?? ""), source, data: clean }
      : null;
  } catch {
    return null;
  }
}

function writeCache(data: ScheduleDataset, source: ScheduleSource) {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        source,
        data,
      } satisfies CachePayload),
    );
  } catch {
    // Private mode / storage full — the in-memory copy still works.
  }
}

export function useSchedule(options: ScheduleOptions = {}): ScheduleState {
  const allowPlaceholder = options.placeholders !== false;
  const version = options.version ?? "";

  const [data, setData] = useState<ScheduleDataset | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [offline, setOffline] = useState(false);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dataRef = useRef<ScheduleDataset | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Paint the cached copy immediately (microtask keeps the effect body
    // free of synchronous state updates), then revalidate over the network.
    Promise.resolve().then(() => {
      if (cancelled || hydrated.current) return;
      hydrated.current = true;
      const cache = readCache(allowPlaceholder);
      if (cache && dataRef.current === null) {
        dataRef.current = cache.data;
        setData(cache.data);
        setIsPlaceholder(cache.source === "placeholder");
        setStatus("ready");
      }
    });

    async function load() {
      // 1) Try live API (DB-synced sheet). The version key changes on every
      //    admin sync, so a fresh upload is never masked by a cached payload.
      try {
        const url = version
          ? `${API_URL}?v=${encodeURIComponent(version)}`
          : API_URL;
        const res = await fetch(url, { cache: "no-cache" });
        if (res.status === 200) {
          const raw = await res.json();
          const clean = sanitizeDataset(raw);
          if (!clean) throw new Error("malformed api schedule");
          if (cancelled) return;
          writeCache(clean, "live");
          dataRef.current = clean;
          setData(clean);
          setStatus("ready");
          setOffline(false);
          setIsPlaceholder(false);
          return;
        }
        // 200 only means "the council has a schedule" — 204 means the DB has
        // no custom data. Both fall through: 204 to the placeholder (if it is
        // still allowed), anything else to the cached copy / error state.
      } catch {
        // API failed, try the placeholder next (when it is still allowed)
      }

      // 2) Fallback to the static placeholder JSON — only while the council
      //    has NOT uploaded a schedule of its own.
      if (!allowPlaceholder) {
        if (cancelled) return;
        if (!hydrated.current) {
          hydrated.current = true;
          const cache = readCache(false);
          if (cache && dataRef.current === null) {
            dataRef.current = cache.data;
            setData(cache.data);
          }
        }
        if (dataRef.current !== null) {
          setStatus("ready");
          setOffline(true);
        } else {
          setStatus("error");
        }
        return;
      }

      try {
        const response = await fetch(DATA_URL, { cache: "no-cache" });
        if (!response.ok) throw new Error(String(response.status));
        const raw = await response.json();
        const clean = sanitizeDataset(raw);
        if (!clean) throw new Error("malformed schedule");
        if (cancelled) return;
        writeCache(clean, "placeholder");
        dataRef.current = clean;
        setData(clean);
        setStatus("ready");
        setOffline(false);
        setIsPlaceholder(true);
      } catch {
        if (cancelled) return;
        if (!hydrated.current) {
          hydrated.current = true;
          const cache = readCache(true);
          if (cache && dataRef.current === null) {
            dataRef.current = cache.data;
            setData(cache.data);
            setIsPlaceholder(cache.source === "placeholder");
          }
        }
        if (dataRef.current !== null) {
          // Keep working with the most recently loaded schedule.
          setStatus("ready");
          setOffline(true);
        } else {
          setStatus("error");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [attempt, allowPlaceholder, version]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { data, status, offline, isPlaceholder, retry };
}

/** When the cached copy was saved (for the "most recently loaded" note). */
export function cacheSavedAt(): string | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return String((JSON.parse(raw) as CachePayload).savedAt ?? "") || null;
  } catch {
    return null;
  }
}
