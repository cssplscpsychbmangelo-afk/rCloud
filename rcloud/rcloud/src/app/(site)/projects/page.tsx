import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import BackHome from "@/components/BackHome";
import ProjectsBoard from "@/components/ProjectsBoard";
import { getProjects } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Council projects with status, budget and utilization — from pending proposals to completed programs.",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <BackHome />
      </div>
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-vio-300">
          Resolutions in action
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-snow sm:text-5xl">
          Projects
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist sm:text-base">
          Every council project, tracked from approval to liquidation. Tap a
          status to filter — each card shows its approved budget, amount
          utilized and what remains.
        </p>
      </Reveal>

      <Reveal delay={100}>
        <ProjectsBoard projects={projects} />
      </Reveal>
    </div>
  );
}
