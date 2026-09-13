import type { Metadata } from "next";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import BackHome from "@/components/BackHome";
import { SectionHeading } from "@/components/Primitives";
import HiddenPage from "@/components/HiddenPage";
import {
  IconChart,
  IconCloud,
  IconExternal,
  IconFacebook,
  IconMail,
  IconPhone,
  IconShield,
  IconUsers,
} from "@/components/Icons";
import { contacts, site } from "@/lib/data/site";
import { getSiteVisibility } from "@/lib/server/siteVisibility";

export const metadata: Metadata = {
  title: "About",
  description:
    "What rCloud is, who runs it, and how to reach the CSSP Local Student Council.",
};

export const dynamic = "force-dynamic";

const pillars = [
  {
    icon: IconCloud,
    title: "One home for resources",
    body: "Documents, templates, directories and hotlines — everything the council publishes, in one searchable place.",
  },
  {
    icon: IconShield,
    title: "Transparency by default",
    body: "Budgets, financial reports and minutes are open to every student, no asking required.",
  },
  {
    icon: IconChart,
    title: "Projects you can track",
    body: "From resolution to liquidation — see what is pending, ongoing, completed or cancelled.",
  },
  {
    icon: IconUsers,
    title: "A council that listens",
    body: "Constituency checks keep the council honest about who needs help first.",
  },
];

const contactIcons = {
  facebook: IconFacebook,
  phone: IconPhone,
  mail: IconMail,
};

export default async function AboutPage() {
  const visibility = await getSiteVisibility();

  if (!visibility.showAbout) {
    return <HiddenPage title="The council, in the open." eyebrow="About rCloud" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <BackHome />
      </div>
      <Reveal>
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="justify-self-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 scale-125 rounded-full bg-vio-600/25 blur-3xl"
              />
              <Image
                src={site.logo}
                alt="Official seal of the CSSP Local Student Council, Bulacan State University"
                width={220}
                height={220}
                className="h-44 w-44 sm:h-56 sm:w-56"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
              About rCloud
            </p>
            <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
              The council, in the open.
            </h1>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-mist sm:text-base">
              {site.intro.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-16">
        <SectionHeading
          eyebrow="What rCloud does"
          title="Four commitments to every student"
        />
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <Reveal key={pillar.title} delay={index * 80}>
              <div className="flex h-full gap-4 rounded-[20px] border border-line bg-panel p-6 transition-colors duration-200 hover:border-line-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2 text-vio-300">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-snow">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist">
                    {pillar.body}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={120} className="mt-16">
        <SectionHeading
          eyebrow="Reach the council"
          title="We answer to you"
          description="Message the council through any official channel."
        />
      </Reveal>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {contacts.map((contact, index) => {
          const Icon = contactIcons[contact.icon];
          const external = contact.href.startsWith("http");
          return (
            <Reveal key={contact.id} delay={index * 80}>
              <a
                href={contact.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="group flex h-full flex-col gap-4 rounded-[20px] border border-line bg-panel p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-vio-600/60 active:border-vio-500 active:bg-vio-950/60 press"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel-2 text-vio-300">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-dim">
                    {contact.label}
                  </span>
                  <span className="mt-1.5 block break-all text-sm font-bold text-snow">
                    {contact.value}
                  </span>
                </span>
                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-vio-300">
                  {external ? "Open" : "Contact"}
                  <IconExternal size={13} />
                </span>
              </a>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={140} className="mt-16">
        <p className="rounded-[20px] border border-line bg-panel px-6 py-5 text-center text-xs text-dim">
          {site.footerMark} · {site.org}, {site.parent}
        </p>
      </Reveal>
    </div>
  );
}
