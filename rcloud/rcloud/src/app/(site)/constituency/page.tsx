import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import BackHome from "@/components/BackHome";
import ConstituencyBrowser from "@/components/ConstituencyBrowser";
import HiddenPage from "@/components/HiddenPage";
import { getConstituency } from "@/lib/server/queries";
import { getSiteVisibility } from "@/lib/server/siteVisibility";
import { PUBLIC_UNAVAILABLE } from "@/lib/server/constituencySheet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Constituency",
  description:
    "A dashboard of how CSSP students are doing — flood impact, safety and internet connectivity.",
};

function formatSyncedAt(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function ConstituencyPage() {
  const [visibility, data] = await Promise.all([
    getSiteVisibility(),
    getConstituency(),
  ]);

  if (!visibility.showConstituency) {
    return <HiddenPage title="How CSSP is doing" eyebrow="Constituency check" />;
  }

  const { periods, lastSyncedAt } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <BackHome />
      </div>
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          Constituency check
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
          How CSSP is doing
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
          The council checks in on its constituents — who is safe, who is
          affected by flooding, and who is struggling to connect. These numbers
          guide where assistance goes first.
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-8">
        {periods.length > 0 ? (
          <ConstituencyBrowser
            periods={periods}
            lastSyncedAt={lastSyncedAt ? formatSyncedAt(lastSyncedAt) : null}
          />
        ) : (
          <div className="rounded-[20px] border border-line bg-panel p-8 text-center">
            <p className="text-sm font-semibold text-mist">
              {PUBLIC_UNAVAILABLE}
            </p>
          </div>
        )}
      </Reveal>
    </div>
  );
}
