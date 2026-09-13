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
 * Network model: one small static fetch → everything local afterwards.
 * If the refresh fails but a cached copy exists, the room finder keeps
 * working with the most recently loaded schedule (clearly labelled).
 */

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

    fetch(DATA_URL, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((raw) => {
        if (cancelled) return;
        const clean = sanitizeDataset(raw);
        if (!clean) throw new Error("malformed schedule");
        writeCache(clean);
        dataRef.current = clean;
        setData(clean);
        setStatus("ready");
        setOffline(false);
      })
      .catch(() => {
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
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { data, status, offline, retry };
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
