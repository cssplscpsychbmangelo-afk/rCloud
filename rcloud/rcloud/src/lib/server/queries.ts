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
  roomfinderEntries,
  roomfinderSettings,
  officerAvailability,
} from "./schema";
import type {
  Announcement,
  OfficerAvailability,
  BudgetSummary,
  ConstituencyPeriod,
  Officer,
  Project,
  ProjectStatus,
  Resource,
} from "../types";
import { site } from "../data/site";
import { ensureSchema } from "./migrate";

/** Public read model — every public page renders from these queries.
 *  All functions are resilient to missing DATABASE_URL / DB errors so that
 *  `next build` succeeds even when Netlify env vars are not set for a site.
 *  In that case they return empty/default data and the UI shows placeholders.
 */

export async function getResources(): Promise<Resource[]> {
  try {
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
  } catch {
    return [];
  }
}

export async function getFeaturedResources(): Promise<Resource[]> {
  try {
    return (await getResources()).filter((r) => r.featured);
  } catch {
    return [];
  }
}

export async function getOfficers(): Promise<Officer[]> {
  try {
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
  } catch {
    return [];
  }
}

export async function getProjects(): Promise<Project[]> {
  try {
    await ensureSchema();
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.published, true))
      .orderBy(desc(projects.createdAt));
    return rows.map(mapProject);
  } catch {
    return [];
  }
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
  try {
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
  } catch {
    return {
      totalBudget: 0,
      allocated: 0,
      utilized: 0,
      remaining: 0,
      period: `AY ${site.term}`,
    };
  }
}

/** Latest active announcements for the home feed — capped at three. */
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
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
  } catch {
    return [];
  }
}

export async function getConstituency(): Promise<{
  periods: ConstituencyPeriod[];
  lastSyncedAt: Date | null;
}> {
  try {
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
  } catch {
    return { periods: [], lastSyncedAt: null };
  }
}

/**
 * Where the public Roomivility schedule comes from — the council's own
 * upload/sync, or the bundled placeholder file.
 *
 * `custom` becomes true as soon as the council has its own schedule (a synced
 * Sheet or an uploaded .xlsx/.csv/.json, even if that sync produced zero
 * rows): the placeholder file is then retired everywhere, so students never
 * see sample rooms next to real ones. It goes back to false only after
 * "Clear & use placeholders" in Admin → Roomivility.
 *
 * `version` is the last-sync timestamp, used by the client as a cache key so a
 * fresh upload is visible immediately instead of waiting out the schedule
 * API's 5-minute CDN cache.
 *
 * Read-only and cheap: at most one indexed lookup on a single-row table, and
 * it degrades to the placeholder behaviour when the DB is unreachable.
 */
export async function getRoomfinderSource(): Promise<{
  custom: boolean;
  version: string;
}> {
  try {
    await ensureSchema();
  } catch {
    // ensureSchema never throws, but stay defensive.
  }

  // The two lookups are independent so that a problem with the settings row
  // can never hide a schedule that was actually uploaded: if entries exist,
  // the placeholders are retired no matter what.
  let hasEntries = false;
  try {
    hasEntries =
      (
        await db
          .select({ id: roomfinderEntries.id })
          .from(roomfinderEntries)
          .limit(1)
      ).length > 0;
  } catch {
    hasEntries = false;
  }

  let syncedAt: Date | null = null;
  try {
    const [settings] = await db
      .select({ lastSyncedAt: roomfinderSettings.lastSyncedAt })
      .from(roomfinderSettings)
      .limit(1);
    syncedAt = settings?.lastSyncedAt ?? null;
  } catch {
    syncedAt = null;
  }

  return {
    custom: hasEntries || syncedAt !== null,
    version: syncedAt ? String(syncedAt.getTime()) : hasEntries ? "custom" : "static",
  };
}

/**
 * Published duty / consultation hours, grouped by officer on the client.
 *
 * Read-only and tiny (a handful of rows per officer). Returns an empty list
 * when nothing has been published yet — the Officers page then simply shows no
 * schedule rather than an invented one.
 */
export async function getOfficerAvailability(): Promise<OfficerAvailability[]> {
  try {
    await ensureSchema();
    const rows = await db
      .select()
      .from(officerAvailability)
      .orderBy(asc(officerAvailability.displayOrder), asc(officerAvailability.start));
    return rows.map((r) => ({
      id: r.id,
      officerId: r.officerId,
      kind: r.kind === "date" ? "date" : "weekly",
      day: r.day,
      date: r.date,
      start: r.start,
      end: r.end,
      location: r.location,
      note: r.note,
    }));
  } catch {
    return [];
  }
}
