import type { Metadata } from "next";
import { Suspense } from "react";
import BackHome from "@/components/BackHome";
import Reveal from "@/components/Reveal";
import RoomFinder from "@/components/roomfinder/RoomFinder";
import { getSiteVisibility } from "@/lib/server/siteVisibility";
import { getRoomfinderSource } from "@/lib/server/queries";

export const metadata: Metadata = {
  title: "Roomivility — CSSP Room Availability",
  description:
    "Roomivility: find a classroom, check a schedule, know where to go — room availability and class schedules for CSSP students, searchable right in your browser.",
};

export const dynamic = "force-dynamic";

export default async function RoomFinderPage() {
  const visibility = await getSiteVisibility();

  if (!visibility.showRoomfinder) {
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
            This page is currently hidden by the council. Please check back later or contact the CSSP Local Student Council for more information.
          </p>
        </Reveal>
      </div>
    );
  }

  // Once the council has its own schedule, the bundled placeholder sample is
  // retired — the page renders only the real data (or an honest error state).
  const source = await getRoomfinderSource();

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
          <RoomFinder
            hasCustomData={source.custom}
            dataVersion={source.version}
          />
        </Suspense>
      </Reveal>
    </div>
  );
}
