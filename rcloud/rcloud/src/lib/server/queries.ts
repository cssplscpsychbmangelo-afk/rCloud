import { asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  announcements,
  constituencyPeriods,
  constituencySettings,
  officers,
  projects,
  resources,
  budget,
} from "./schema";
import type {
  Announcement,
  BudgetSummary,
  ConstituencyPeriod,
  Officer,
  Project,
  ProjectStatus,
  Resource,
} from "../types";
import { site } from "../data/site";
import { ensureSchema } from "./migrate";

/** Public read model — every public page renders from these queries. */

export async function getResources(): Promise<Resource[]> {
  const rows = await db
    .select()
    .from(resources)
    .where(eq(resources.active, true))
    .orderBy(asc(resources.displayOrder));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.url,
    internal: r.internal,
    category: r.category,
    icon: r.icon,
    tags: r.tags ? r.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    featured: r.featured,
    active: r.active,
    displayOrder: r.displayOrder,
  }));
}

export async function getFeaturedResources(): Promise<Resource[]> {
  return (await getResources()).filter((r) => r.featured);
}

export async function getOfficers(): Promise<Officer[]> {
  const rows = await db
    .select()
    .from(officers)
    .where(eq(officers.active, true))
    .orderBy(asc(officers.displayOrder));
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    position: o.portfolio ? `${o.position} — ${o.portfolio}` : o.position,
    portfolio: o.portfolio,
    description: o.description,
    photoUrl: o.photoUrl,
    displayOrder: o.displayOrder,
    active: o.active,
  }));
}

export async function getProjects(): Promise<Project[]> {
  await ensureSchema();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.published, true))
    .orderBy(desc(projects.createdAt));
  return rows.map(mapProject);
}

function mapProject(p: typeof projects.$inferSelect): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    status: p.status as ProjectStatus,
    date: p.date ? p.date.toISOString() : null,
    approvedBudget: p.approvedBudget,
    actualExpenditure: p.actualExpenditure,
    projectLead: p.projectLead,
    imageUrl: p.imageUrl,
    documentLinks: p.documentLinks
      ? p.documentLinks.split("\n").map((l) => l.trim()).filter(Boolean)
      : [],
    transparencyNotes: p.transparencyNotes,
    published: p.published,
  };
}

/** Totals are always computed from the records — never hand-entered. */
export async function getBudgetSummary(): Promise<BudgetSummary> {
  await ensureSchema();
  const [row] = await db.select().from(budget);
  const published = await db
    .select()
    .from(projects)
    .where(eq(projects.published, true));

  const allocated = published.reduce((sum, p) => sum + p.approvedBudget, 0);
  const utilized = published.reduce((sum, p) => sum + p.actualExpenditure, 0);

  return {
    totalBudget: row?.totalBudget ?? 0,
    allocated,
    utilized,
    remaining: allocated - utilized,
    period: `AY ${site.term}`,
  };
}

/** Latest active announcements for the home feed — capped at three. */
export async function getAnnouncements(): Promise<Announcement[]> {
  const rows = await db
    .select()
    .from(announcements)
    .where(eq(announcements.active, true))
    .orderBy(desc(announcements.publishedAt))
    .limit(3);
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category,
    externalUrl: a.externalUrl,
    featured: a.featured,
    date: a.publishedAt.toISOString(),
  }));
}

export async function getConstituency(): Promise<{
  periods: ConstituencyPeriod[];
  lastSyncedAt: Date | null;
}> {
  const [rows, settings] = await Promise.all([
    db
      .select()
      .from(constituencyPeriods)
      .orderBy(asc(constituencyPeriods.position)),
    db.select().from(constituencySettings).limit(1),
  ]);
  return {
    periods: rows.map((r) => ({
      id: r.id,
      label: r.label,
      safe: r.safe,
      baha: r.baha,
      internet: r.internet,
    })),
    lastSyncedAt: settings[0]?.lastSyncedAt ?? null,
  };
}
