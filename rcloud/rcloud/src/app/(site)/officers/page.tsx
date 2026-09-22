import type { Metadata } from "next";
import { Suspense } from "react";
import Reveal from "@/components/Reveal";
import BackHome from "@/components/BackHome";
import OfficersBoard from "@/components/officers/OfficersBoard";
import HiddenPage from "@/components/HiddenPage";
import { site } from "@/lib/data/site";
import { getOfficers } from "@/lib/server/queries";
import { getSiteVisibility } from "@/lib/server/siteVisibility";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Officers",
  description:
    `The elected officers of the CSSP Local Student Council, AY ${site.term}.`,
};

export default async function OfficersPage() {
  const [visibility, officers] = await Promise.all([
    getSiteVisibility(),
    getOfficers(),
  ]);

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
          and Philosophy — one council, every program represented.
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
          <OfficersBoard officers={officers} />
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
