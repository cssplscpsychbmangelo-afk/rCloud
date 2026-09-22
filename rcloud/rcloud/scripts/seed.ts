/* Seeds the rCloud database with the council's existing public content
   (from the original rCloud repository) plus admin accounts.
   Run: npm run db:push && npm run db:seed                       */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env (scripts run outside Next's env loading)
try {
  for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch {
  /* rely on real environment */
}

async function main() {
  const { db } = await import("../src/lib/server/db");
  const { sql } = await import("drizzle-orm");
  const { hashPassword } = await import("../src/lib/server/passwords");
  const {
    users, resources, officers, projects, announcements, budget,
    officerAvailability,
  } = await import("../src/lib/server/schema");

  const { resources: resourceSeed } = await import("../src/lib/data/resources");
  const { officers: officerSeed } = await import("../src/lib/data/officers");
  const { projects: projectSeed } = await import("../src/lib/data/projects");
  const { announcements: announcementSeed } = await import("../src/lib/data/announcements");
  const { matchEoColumns } = await import("../src/lib/officers");

  await db.execute(
    sql`TRUNCATE users, sessions, resources, officers, projects, announcements, budget RESTART IDENTITY CASCADE`,
  );

  /* ------------------------------- accounts ------------------------------- */
  const DEV_PASSWORD = "rcloud2026";
  const accounts: Array<[string, string, string]> = [
    ["Head Admin (Governor & Vice Governor)", "headadmin@rcloud.cssp", "head_admin"],
    ["Moderator (Board Members)", "moderator@rcloud.cssp", "moderator"],
  ];
  for (const [name, email, role] of accounts) {
    await db.insert(users).values({ name, email, role, passwordHash: hashPassword(DEV_PASSWORD) });
  }

  /* ------------------------------- resources ------------------------------ */
  const featured = new Set([
    "crisis-hotlines", "financial-reports", "legislative-documents",
    "minutes-of-the-meeting", "sg-constitution", "classroom-officers",
  ]);
  for (const [index, r] of resourceSeed.entries()) {
    await db.insert(resources).values({
      title: r.title,
      description: r.description,
      category: r.category,
      url: r.url,
      icon: r.icon,
      tags: r.tags.join(", "),
      internal: Boolean(r.internal),
      featured: featured.has(r.id),
      active: true,
      displayOrder: index,
    });
  }

  /* -------------------------------- officers ------------------------------ */
  for (const o of officerSeed) {
    const [position, portfolio] = o.position.split(" — ");
    await db.insert(officers).values({
      name: o.name,
      position: portfolio ? position : o.position,
      portfolio: portfolio ?? null,
      description: "",
      photoUrl: o.photoUrl,
      displayOrder: o.order,
      active: true,
    });
  }

  /* ------------------ officer availability (EO No. 10, s. 2026) ------------ */
  // The published availability schedule, matched to the roster just like the
  // admin one-click loader does, so a freshly seeded database already shows
  // the weekly timetable.
  const seededOfficers = await db.select().from(officers);
  const { matched } = matchEoColumns(
    seededOfficers.map((officer) => ({
      id: officer.id,
      name: officer.name,
      position: officer.position,
      portfolio: officer.portfolio,
      description: officer.description,
      photoUrl: officer.photoUrl,
      displayOrder: officer.displayOrder,
      active: officer.active,
    })),
  );
  let availabilityBlocks = 0;
  for (const { column, officer } of matched) {
    if (column.blocks.length === 0) continue;
    await db.insert(officerAvailability).values(
      column.blocks.map((block, position) => ({
        officerId: officer.id,
        kind: "weekly",
        day: block.day,
        date: "",
        start: block.start,
        end: block.end,
        location: "",
        note: "Executive Order No. 10, s. 2026 — no scheduled classes",
        displayOrder: position,
      })),
    );
    availabilityBlocks += column.blocks.length;
  }

  /* -------------------------------- projects ------------------------------ */
  for (const p of projectSeed) {
    await db.insert(projects).values({
      name: p.name,
      description: p.description,
      status: p.status,
      approvedBudget: p.budget,
      actualExpenditure: p.utilized,
      published: true,
      approvalStatus: "approved",
    });
  }

  /* ----------------------------- announcements ---------------------------- */
  for (const a of announcementSeed) {
    await db.insert(announcements).values({
      title: a.title,
      content: a.body,
      category: a.tag,
      publishedAt: new Date(a.date),
      active: true,
    });
  }

  /* --------------------------------- budget ------------------------------- */
  await db.insert(budget).values({ totalBudget: 150_000 });

  console.log(`Seeded: ${accounts.length} accounts, ` +
    `${resourceSeed.length} resources, ${officerSeed.length} officers, ` +
    `${projectSeed.length} projects, ${announcementSeed.length} announcements, ` +
    `${availabilityBlocks} officer availability blocks.`);
  console.log("Constituency data is not seeded — it syncs from the configured Google Sheet (Admin → Constituency → Refresh).");
  console.log(`Dev login: headadmin@rcloud.cssp / ${DEV_PASSWORD} (Head Admin, full access) · moderator@rcloud.cssp (Moderator, content only)`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
