import type { Metadata } from "next";
import { Suspense } from "react";
import BackHome from "@/components/BackHome";
import Reveal from "@/components/Reveal";
import RoomFinder from "@/components/roomfinder/RoomFinder";

/**
 * CSSP Room Finder — a student-facing schedule viewer.
 *
 * The page itself is fully static: no database, no server logic. The schedule
 * is a small JSON file under /public/data/ fetched once by the client, after
 * which every search, filter and availability check runs locally in the
 * browser (see the deployment notes in the README).
 */
export const metadata: Metadata = {
  title: "Roomivility — CSSP Room Availability",
  description:
    "Roomivility: find a classroom, check a schedule, know where to go — room availability and class schedules for CSSP students, searchable right in your browser.",
};

export default function RoomFinderPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <BackHome />
      </div>
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          CSSP room availability
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
          Roomivility
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
          Find a classroom. Check a schedule. Know where to go.
        </p>
      </Reveal>
      <Reveal delay={100} className="mt-8">
        <Suspense
          fallback={
            <div className="flex min-h-56 items-center justify-center rounded-[20px] border border-line bg-panel p-8">
              <p className="text-sm font-semibold text-mist">
                Loading the schedule…
              </p>
            </div>
          }
        >
          <RoomFinder />
        </Suspense>
      </Reveal>
    </div>
  );
}
