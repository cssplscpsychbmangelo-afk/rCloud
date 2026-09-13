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
 */

const API_URL = "/api/roomfinder/schedule";
const DATA_URL = "/data/cssp-schedule.json";
const CACHE_KEY = "rcloud.roomfinder.schedule.v1";

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
  data: ScheduleDataset;
}

function readCache(): CachePayload | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    const clean = sanitizeDataset(parsed.data);
    return clean
      ? { savedAt: String(parsed.savedAt ?? ""), data: clean }
      : null;
  } catch {
    return null;
  }
}

function writeCache(data: ScheduleDataset) {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), data }),
    );
  } catch {
    // Private mode / storage full — the in-memory copy still works.
  }
}

export function useSchedule(): ScheduleState {
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
      const cache = readCache();
      if (cache && dataRef.current === null) {
        dataRef.current = cache.data;
        setData(cache.data);
        setStatus("ready");
      }
    });

    async function load() {
      // 1) Try live API (DB-synced sheet)
      try {
        const res = await fetch(API_URL, { cache: "no-cache" });
        if (res.status === 200) {
          const raw = await res.json();
          const clean = sanitizeDataset(raw);
          if (!clean) throw new Error("malformed api schedule");
          if (cancelled) return;
          writeCache(clean);
          dataRef.current = clean;
          setData(clean);
          setStatus("ready");
          setOffline(false);
          setIsPlaceholder(false);
          return;
        }
        // 204 means no custom sheet — fall through to placeholder
      } catch {
        // API failed, try placeholder next
      }

      // 2) Fallback to static placeholder JSON
      try {
        const response = await fetch(DATA_URL, { cache: "no-cache" });
        if (!response.ok) throw new Error(String(response.status));
        const raw = await response.json();
        const clean = sanitizeDataset(raw);
        if (!clean) throw new Error("malformed schedule");
        if (cancelled) return;
        writeCache(clean);
        dataRef.current = clean;
        setData(clean);
        setStatus("ready");
        setOffline(false);
        setIsPlaceholder(true);
      } catch {
        if (cancelled) return;
        if (!hydrated.current) {
          hydrated.current = true;
          const cache = readCache();
          if (cache && dataRef.current === null) {
            dataRef.current = cache.data;
            setData(cache.data);
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
  }, [attempt]);

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
