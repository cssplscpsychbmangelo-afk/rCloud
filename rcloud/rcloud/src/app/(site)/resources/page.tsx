import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import BackHome from "@/components/BackHome";
import ResourceSearch from "@/components/ResourceSearch";
import HiddenPage from "@/components/HiddenPage";
import { getResources } from "@/lib/server/queries";
import { getSiteVisibility } from "@/lib/server/siteVisibility";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Every document, report, directory and hotline published on rCloud — searchable and open to all CSSP students.",
};

export default async function ResourcesPage() {
  const [visibility, resources] = await Promise.all([
    getSiteVisibility(),
    getResources(),
  ]);

  if (!visibility.showResources) {
    return <HiddenPage title="Resources" eyebrow="Resource repository" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <BackHome />
      </div>
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          Resource repository
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
          Resources
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
          The complete rCloud repository — all {resources.length} official
          resources from the council, preserved and searchable. Search by name
          or filter by category.
        </p>
      </Reveal>
      <Reveal delay={120} className="mt-10">
        <ResourceSearch resources={resources} />
      </Reveal>
    </div>
  );
}
