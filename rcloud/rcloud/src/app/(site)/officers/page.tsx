import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import BackHome from "@/components/BackHome";
import { OfficerCard } from "@/components/Cards";
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
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
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

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {officers.map((officer, index) => (
          <Reveal key={officer.id} delay={(index % 3) * 80}>
            <OfficerCard officer={officer} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
