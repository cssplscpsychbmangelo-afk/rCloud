import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import { StatCard } from "@/components/Cards";
import ProgressBar from "@/components/ProgressBar";
import HiddenPage from "@/components/HiddenPage";
import {
  IconClock,
  IconExternal,
  IconFolder,
  IconScale,
  IconCoins,
} from "@/components/Icons";
import { getBudgetSummary, getResources } from "@/lib/server/queries";
import { getSiteVisibility } from "@/lib/server/siteVisibility";
import { formatPeso, percentOf } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transparency",
  description:
    "The council budget at a glance, plus the official financial and legislative documents behind every figure.",
};

const documentTitles = [
  "Financial Reports",
  "Executive Documents",
  "Legislative Documents",
  "Minutes of the Meeting",
];

const documentIcons: Record<string, typeof IconFolder> = {
  "Financial Reports": IconCoins,
  "Executive Documents": IconFolder,
  "Legislative Documents": IconScale,
  "Minutes of the Meeting": IconClock,
};

export default async function TransparencyPage() {
  const [visibility, summary, resources] = await Promise.all([
    getSiteVisibility(),
    getBudgetSummary(),
    getResources(),
  ]);

  if (!visibility.showTransparency) {
    return <HiddenPage title="Transparency" eyebrow="Open books" />;
  }

  const documents = resources.filter((r) => documentTitles.includes(r.title));

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          Open books
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
          Transparency
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
          Every peso the council receives and spends is documented. The
          snapshot below is computed live from published project records; the
          official documents behind it are linked underneath.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Budget", formatPeso(summary.totalBudget), "Approved council fund"],
          ["Allocated", formatPeso(summary.allocated), "Assigned to projects"],
          ["Utilized", formatPeso(summary.utilized), "Spent & liquidated"],
          ["Remaining", formatPeso(summary.remaining), "Available balance"],
        ].map(([label, value, hint], index) => (
          <Reveal key={label} delay={index * 80}>
            <StatCard label={label} value={value} hint={hint} />
          </Reveal>
        ))}
      </div>

      {/* Utilization bars */}
      <Reveal delay={120} className="mt-10">
        <div className="rounded-[20px] border border-line bg-panel p-6 sm:p-8">
          <h2 className="font-display text-lg font-extrabold text-snow">
            Utilization at a glance
          </h2>
          <div className="mt-6 space-y-6">
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <p className="text-sm font-semibold text-mist">
                  Allocated vs total budget
                </p>
                <p className="tnum text-sm font-bold text-snow">
                  {percentOf(summary.allocated, summary.totalBudget)}%
                </p>
              </div>
              <ProgressBar
                value={summary.allocated}
                max={summary.totalBudget}
                label="Allocated share of total budget"
              />
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <p className="text-sm font-semibold text-mist">
                  Utilized vs allocated
                </p>
                <p className="tnum text-sm font-bold text-snow">
                  {percentOf(summary.utilized, summary.allocated)}%
                </p>
              </div>
              <ProgressBar
                value={summary.utilized}
                max={summary.allocated}
                tone="ok"
                label="Utilized share of allocated budget"
              />
            </div>
          </div>
        </div>
      </Reveal>

      {/* Official documents */}
      <Reveal delay={140} className="mt-12">
        <h2 className="font-display text-xl font-extrabold text-snow">
          Official documents
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          The source records behind the numbers — published on the official
          rCloud repository.
        </p>
      </Reveal>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {documents.map((doc, index) => {
          const Icon = documentIcons[doc.title] ?? IconFolder;
          return (
            <Reveal key={doc.id} delay={index * 80}>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-[20px] border border-line bg-panel p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-vio-600/60 active:border-vio-500 active:bg-vio-950/60 press"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2 text-vio-300">
                  <Icon size={22} />
                </span>
                <span className="grow">
                  <span className="block font-display text-base font-bold text-snow">
                    {doc.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-mist">
                    {doc.description}
                  </span>
                </span>
                <IconExternal
                  size={16}
                  className="shrink-0 text-dim transition-colors duration-200 group-hover:text-vio-300"
                />
              </a>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
