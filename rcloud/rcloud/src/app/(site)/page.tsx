import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { btnGhost, btnGhostSm, btnPrimary, SectionHeading } from "@/components/Primitives";
import {
  OfficerCard,
  ProjectCard,
  ResourceCard,
  StatCard,
} from "@/components/Cards";
import { IconArrowRight, IconCoins, IconExternal } from "@/components/Icons";
import AnnouncementsBoard from "@/components/AnnouncementsBoard";
import { site } from "@/lib/data/site";
import {
  organizations,
  publications,
  socioCulturalGroups,
  type OrgEntry,
} from "@/lib/data/orgs";
import { formatNumber, formatPeso } from "@/lib/format";
import {
  getAnnouncements,
  getBudgetSummary,
  getConstituency,
  getFeaturedResources,
  getOfficers,
  getProjects,
  getResources,
} from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [resources, featured, officers, projects, summary, constituency, announcements] =
    await Promise.all([
      getResources(),
      getFeaturedResources(),
      getOfficers(),
      getProjects(),
      getBudgetSummary(),
      getConstituency(),
      getAnnouncements(),
    ]);

  const latestPeriod =
    constituency.periods[constituency.periods.length - 1] ?? null;

  const heroStats: Array<[string, string]> = [
    [String(resources.length), "Resources"],
    [String(officers.length), "Officers"],
    [String(projects.length), "Projects"],
  ];

  return (
    <>
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50rem 26rem at 76% -18%, oklch(0.45 0.18 295 / 0.16), transparent 62%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24 lg:pt-28">
          <Reveal>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">
              <span aria-hidden className="h-px w-10 bg-vio-500/70" />
              {site.org} · {site.parent}
            </p>

            <h1 className="mt-7 font-display text-6xl font-black tracking-tight sm:text-8xl">
              <span className="bg-gradient-to-b from-snow via-snow to-vio-300 bg-clip-text text-transparent">
                rCloud
              </span>
            </h1>
            <p className="mt-4 font-display text-lg font-bold text-vio-300 sm:text-xl">
              {site.tagline}
            </p>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-mist sm:text-base">
              {site.intro[0]}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/resources" className={btnPrimary}>
                Explore Resources
                <IconArrowRight size={15} />
              </Link>
              <Link href="/transparency" className={btnGhost}>
                View Transparency
              </Link>
              <Link href="/projects" className={btnGhost}>
                Check Projects
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-3 divide-x divide-line border-y border-line">
              {heroStats.map(([value, label]) => (
                <div key={label} className="px-2 py-4 text-center sm:py-5">
                  <dd className="tnum font-display text-2xl font-extrabold text-snow sm:text-3xl">
                    {value}
                  </dd>
                  <dt className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
                    {label}
                  </dt>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={120} className="justify-self-center lg:justify-self-end">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 scale-110 rounded-full bg-vio-600/15 blur-2xl"
              />
              <div className="rounded-full border border-line p-4 sm:p-6">
                <div className="rounded-full border border-line bg-panel/40 p-7 sm:p-9">
                  <Image
                    src={site.logo}
                    alt="Official seal of the CSSP Local Student Council — Kolehiyo ng Agham Panlipunan at Pilosopiya, Lokal na Konseho ng Mag-aaral"
                    width={240}
                    height={240}
                    priority
                    className="h-44 w-44 sm:h-56 sm:w-56"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------- Announcements ------------------------- */}
      <section className="border-b border-vio-700/30 bg-abyss/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Announcements"
              title="Latest from the council"
              description="The three most recent advisories and updates, posted here first, right where they are easy to find."
            />
          </Reveal>
          <AnnouncementsBoard announcements={announcements} />
        </div>
      </section>

      {/* --------------------------- Quick access --------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Quick access"
            title="The resources students reach for most"
            description="Everything below lives on the official rCloud repository — nothing removed, nothing hidden."
            action={
              <Link href="/resources" className={btnGhostSm}>
                Browse all resources
                <IconArrowRight size={15} />
              </Link>
            }
          />
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((resource, index) => (
            <Reveal key={resource.id} delay={index * 80}>
              <ResourceCard resource={resource} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ----------------------- Transparency snapshot ---------------------- */}
      <section className="border-y border-line bg-abyss/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Transparency snapshot"
              title="Where the council fund stands"
              description="A live-at-a-glance view of the council budget, computed from published project records."
              action={
                <Link href="/transparency" className={btnGhostSm}>
                  Full transparency page
                  <IconArrowRight size={15} />
                </Link>
              }
            />
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total Budget", formatPeso(summary.totalBudget)],
              ["Allocated", formatPeso(summary.allocated)],
              ["Utilized", formatPeso(summary.utilized)],
              ["Remaining", formatPeso(summary.remaining)],
            ].map(([label, value], index) => (
              <Reveal key={label} delay={index * 80}>
                <StatCard label={label} value={value} hint={summary.period} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- Current projects ----------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Current projects"
            title="What the council is working on"
            description="Status and utilization per project — from approved resolutions to completed programs."
            action={
              <Link href="/projects" className={btnGhostSm}>
                All projects
                <IconArrowRight size={15} />
              </Link>
            }
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 3).map((project, index) => (
            <Reveal key={project.id} delay={index * 80}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------------------------- Constituency check ---------------------- */}
      <section className="border-y border-line bg-abyss/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Constituency check"
              title="How CSSP students are doing"
              description="A pulse check on the student body — flood impact, safety and connectivity."
              action={
                <Link href="/constituency" className={btnGhostSm}>
                  Constituency dashboard
                  <IconArrowRight size={15} />
                </Link>
              }
            />
          </Reveal>
          {latestPeriod ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Reveal>
                  <StatCard label="Apektado ng Baha" value={formatNumber(latestPeriod.baha)} hint={latestPeriod.label} />
                </Reveal>
                <Reveal delay={80}>
                  <StatCard label="Safe" value={formatNumber(latestPeriod.safe)} hint={latestPeriod.label} />
                </Reveal>
                <Reveal delay={160}>
                  <StatCard label="Walang Internet / Mabagal ang Internet Connection" value={formatNumber(latestPeriod.internet)} hint={latestPeriod.label} />
                </Reveal>
              </div>

              {/* Student entry point: view the data and build a personal report */}
              <Reveal delay={220}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Link
                    href="/constituency#student-report"
                    className={btnPrimary}
                  >
                    See the data &amp; create my report
                    <IconArrowRight size={15} />
                  </Link>
                  <p className="text-xs leading-relaxed text-dim">
                    Pick a date, add your name and section if you need them, and
                    download the official CSSP LSC Constituency Check PDF.
                  </p>
                </div>
              </Reveal>
            </>
          ) : (
            <p className="mt-6 text-sm text-mist">
              Constituency data is temporarily unavailable. Please check again later.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------ Officers ---------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="The cabinet"
            title={`Your council, AY ${site.term}`}
            description="The elected officers serving the CSSP student body."
            action={
              <Link href="/officers" className={btnGhostSm}>
                Meet the officers
                <IconArrowRight size={15} />
              </Link>
            }
          />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {officers.map((officer, index) => (
            <Reveal key={officer.id} delay={(index % 4) * 70}>
              <OfficerCard officer={officer} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* --------------------- Organizations & socio-cultural ---------------- */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Directory"
              title="CSSP Groups Directory"
              description="The accredited organizations and groups of the College of Social Sciences and Philosophy."
            />
          </Reveal>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {(
              [
                ["Organizations", organizations],
                ["Socio-cultural groups", socioCulturalGroups],
                ["Publication", publications],
              ] as Array<[string, OrgEntry[]]>
            ).map(([groupLabel, entries]) => (
              <div key={groupLabel}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
                  {groupLabel}
                </h3>
                <ul className="mt-3 space-y-2">
                  {entries.map((org) => (
                    <li key={org.name}>
                      <a
                        href={org.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-sm transition-colors duration-200 hover:border-vio-600/60 hover:bg-panel-2 active:border-vio-500 active:bg-vio-950 press"
                      >
                        <span className="min-w-0">
                          <span className="block font-display font-bold text-snow">
                            {org.name}
                          </span>
                          <span className="block truncate text-xs text-mist">
                            {org.tag}
                          </span>
                        </span>
                        <IconExternal
                          size={14}
                          className="shrink-0 text-vio-300 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- CTA -------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[24px] border border-vio-700/50 bg-gradient-to-br from-vio-950 via-panel to-night p-8 sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-vio-600/25 blur-3xl"
            />
            <div className="flex items-start gap-5">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-vio-500/40 bg-vio-950 text-vio-300 sm:flex">
                <IconCoins size={22} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-snow sm:text-3xl">
                  An informed campus is a stronger campus.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
                  {site.intro[1]}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/resources" className={btnPrimary}>
                    Explore Resources
                    <IconArrowRight size={15} />
                  </Link>
                  <Link href="/about" className={btnGhost}>
                    About rCloud
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
