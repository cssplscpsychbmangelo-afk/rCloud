"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Officer, OfficerAvailability } from "@/lib/types";
import OfficersBoard from "./OfficersBoard";
import OfficersTimetable from "./OfficersTimetable";

/**
 * The Officers page body: the weekly timetable and the roster board, wired
 * together.
 *
 * The expanded card lives here so the two views can drive each other — tapping
 * an officer in the timetable opens (and scrolls to) that officer's card below,
 * which is what makes the page feel like one piece rather than two lists.
 * `/officers?officer=<id>` opens a card straight away.
 */
export default function OfficersSection({
  officers,
  availability,
}: {
  officers: Officer[];
  availability: OfficerAvailability[];
}) {
  const searchParams = useSearchParams();

  // Deep link, read once — the same idea as the Room Finder's `?room=`.
  const [openId, setOpenId] = useState<string | null>(() => {
    try {
      return searchParams?.get("officer") ?? null;
    } catch {
      return null;
    }
  });

  const pickOfficer = useCallback((officerId: string) => {
    setOpenId(officerId);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`officer-${officerId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  return (
    <div className="space-y-6">
      <OfficersTimetable
        officers={officers}
        availability={availability}
        onPickOfficer={pickOfficer}
      />
      <OfficersBoard
        officers={officers}
        availability={availability}
        openId={openId}
        onOpenChange={setOpenId}
      />
    </div>
  );
}
