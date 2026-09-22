import type { Metadata } from "next";
import { Suspense } from "react";
import Reveal from "@/components/Reveal";
import BackHome from "@/components/BackHome";
import OfficersSection from "@/components/officers/OfficersSection";
import HiddenPage from "@/components/HiddenPage";
import { site } from "@/lib/data/site";
import { getOfficerAvailability, getOfficers } from "@/lib/server/queries";
import { eoAvailabilityFor } from "@/lib/officers";
import { getSiteVisibility } from "@/lib/server/siteVisibility";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Officers",
  description:
    `The elected officers of the CSSP Local Student Council, AY ${site.term}.`,
};

export default async function OfficersPage() {
  const [visibility, officers, availability] = await Promise.all([
    getSiteVisibility(),
    getOfficers(),
    getOfficerAvailability(),
  ]);

  // Only active officers are rendered, so only their hours travel. While the
  // council has not published hours of its own, the transcribed Executive
  // Order schedule is shown (clearly labelled) so students have the timetable
  // from day one; publishing any hours switches to that data alone.
  const visibleIds = new Set(officers.map((officer) => officer.id));
  const publishedHours = availability.filter((slot) =>
    visibleIds.has(slot.officerId),
  );
  const officerHours =
    publishedHours.length > 0 ? publishedHours : eoAvailabilityFor(officers);

  if (!visibility.showOfficers) {
    return <HiddenPage title="LSC Officers" eyebrow={`AY ${site.term}`} />;
  }

  return (
    <div id="officers-top" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
      <div className="mb-8">
        <BackHome />
      </div>
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          AY {site.term}
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
          LSC Officers
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
          The elected student officers serving the College of Social Sciences
          and Philosophy — one council, every program represented. Search the
          roster, filter by program, and open a card to see that officer&apos;s
          profile and published duty / consultation hours.
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-10">
        <Suspense
          fallback={
            <div className="rounded-[20px] border border-line bg-panel px-6 py-12 text-center">
              <p className="text-sm font-semibold text-mist">
                Loading the roster…
              </p>
            </div>
          }
        >
          <OfficersSection officers={officers} availability={officerHours} />
        </Suspense>
      </Reveal>

      {officers.length === 0 && (
        <p className="mt-6 rounded-[20px] border border-line bg-panel px-6 py-12 text-center text-sm text-mist">
          The roster for AY {site.term} has not been published yet.
        </p>
      )}
    </div>
  );
}
