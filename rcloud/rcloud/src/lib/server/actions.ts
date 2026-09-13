"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import {
  announcements,
  budget,
  constituencyPeriods,
  constituencySettings,
  officers,
  projects,
  resources,
  users,
  roomfinderEntries,
  roomfinderSettings,
  siteSettings,
} from "./schema";
import {
  createSession,
  destroySession,
  requirePermission,
  requireSession,
  hashPassword,
  verifyPassword,
} from "./auth";
import { parseSheetId as parseConstituencySheetId, readConstituencySheet } from "./constituencySheet";
import {
  parseSheetId as parseRoomfinderSheetId,
  readRoomfinderSheet,
  extractEntriesFromXlsx,
  readEntriesFromRows,
  parseCsv,
} from "./roomfinderSheet";
import { ensureSchema } from "./migrate";

/* --------------------------------- helpers -------------------------------- */

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function int(form: FormData, key: string): number {
  const value = Number(str(form, key));
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

async function imageData(form: FormData, key: string): Promise<string | null> {
  const file = form.get(key);
  if (!(file instanceof File) || file.size === 0) return null;
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    throw new Error("Only PNG, JPG or WebP images are allowed.");
  }
  if (file.size > 400_000) {
    throw new Error("Image too large — keep it under 400 KB or paste an external link.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function back(path: string) {
  revalidatePath("/", "layout");
  redirect(path);
}

/* ---------------------------------- auth ---------------------------------- */

export async function loginAction(form: FormData): Promise<void> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    redirect("/admin/login?error=1");
  }
  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

/* ---------------------------- content: resources --------------------------- */

export async function saveResource(form: FormData): Promise<void> {
  await requirePermission("content");
  const id = str(form, "id");
  const values = {
    title: str(form, "title"),
    description: str(form, "description"),
    category: str(form, "category") || "Council Documents",
    url: str(form, "url"),
    icon: str(form, "icon") || "folder",
    tags: str(form, "tags"),
    internal: bool(form, "internal"),
    featured: bool(form, "featured"),
    active: bool(form, "active"),
    updatedAt: new Date(),
  };
  if (!values.title || !values.url) redirect("/admin/resources?error=missing");

  if (id) {
    await db.update(resources).set(values).where(eq(resources.id, id));
  } else {
    const [top] = await db
      .select({ displayOrder: resources.displayOrder })
      .from(resources)
      .orderBy(desc(resources.displayOrder))
      .limit(1);
    await db
      .insert(resources)
      .values({ ...values, displayOrder: (top?.displayOrder ?? -1) + 1 });
  }
  back("/admin/resources");
}

export async function deleteResource(form: FormData): Promise<void> {
  await requirePermission("content");
  await db.delete(resources).where(eq(resources.id, str(form, "id")));
  back("/admin/resources");
}

export async function moveResource(form: FormData): Promise<void> {
  await requirePermission("content");
  await moveOrder(resources, str(form, "id"), Number(form.get("dir")), "/admin/resources");
}

export async function toggleResource(form: FormData): Promise<void> {
  await requirePermission("content");
  const flag = str(form, "flag") === "featured" ? "featured" : "active";
  const id = str(form, "id");
  const [row] = await db.select().from(resources).where(eq(resources.id, id));
  if (row) {
    await db
      .update(resources)
      .set({ [flag]: !row[flag], updatedAt: new Date() })
      .where(eq(resources.id, id));
  }
  back("/admin/resources");
}

/* ---------------------------- content: officers ---------------------------- */

export async function saveOfficer(form: FormData): Promise<void> {
  await requirePermission("content");
  const id = str(form, "id");
  let photoUrl = str(form, "photoUrl") || null;
  try {
    const uploaded = await imageData(form, "photo");
    if (uploaded) photoUrl = uploaded;
  } catch (error) {
    redirect(`/admin/officers?error=${encodeURIComponent((error as Error).message)}`);
  }
  const values = {
    name: str(form, "name"),
    position: str(form, "position"),
    portfolio: str(form, "portfolio") || null,
    description: str(form, "description"),
    photoUrl,
    active: bool(form, "active"),
    updatedAt: new Date(),
  };
  if (!values.name || !values.position) redirect("/admin/officers?error=missing");

  if (id) {
    await db.update(officers).set(values).where(eq(officers.id, id));
  } else {
    const [top] = await db
      .select({ displayOrder: officers.displayOrder })
      .from(officers)
      .orderBy(desc(officers.displayOrder))
      .limit(1);
    await db.insert(officers).values({ ...values, displayOrder: (top?.displayOrder ?? 0) + 1 });
  }
  back("/admin/officers");
}

export async function deleteOfficer(form: FormData): Promise<void> {
  await requirePermission("content");
  await db.delete(officers).where(eq(officers.id, str(form, "id")));
  back("/admin/officers");
}

export async function moveOfficer(form: FormData): Promise<void> {
  await requirePermission("content");
  await moveOrder(officers, str(form, "id"), Number(form.get("dir")), "/admin/officers");
}

export async function toggleOfficer(form: FormData): Promise<void> {
  await requirePermission("content");
  const id = str(form, "id");
  const [row] = await db.select().from(officers).where(eq(officers.id, id));
  if (row) {
    await db
      .update(officers)
      .set({ active: !row.active, updatedAt: new Date() })
      .where(eq(officers.id, id));
  }
  back("/admin/officers");
}

/* ---------------------------- content: projects ---------------------------- */

/**
 * Adds or edits a project. The form only collects what matters — name,
 * description, status and an optional external photo link — so no file upload
 * is handled here. Fields the form no longer collects (category, date, lead,
 * document links, transparency notes) keep their stored values when editing.
 */
export async function saveProjectDetails(form: FormData): Promise<void> {
  await requirePermission("content");
  await ensureSchema();
  const session = await requireSession();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) redirect("/admin/projects?error=missing");

  const values = {
    name,
    description: str(form, "description"),
    status: str(form, "status") || "Pending",
    imageUrl: str(form, "imageUrl") || null,
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(projects).set(values).where(eq(projects.id, id));
  } else {
    const isHeadAdmin = session.role === "head_admin";
    await db.insert(projects).values({
      ...values,
      date: new Date(),
      published: isHeadAdmin,
      approvalStatus: isHeadAdmin ? "approved" : "pending",
    });
  }
  back(id ? `/admin/projects?edit=${id}` : "/admin/projects");
}

/**
 * Finance-only: approved budget + actual expenditure per project.
 */
export async function saveProjectFinance(form: FormData): Promise<void> {
  await requirePermission("finance");
  await ensureSchema();
  const id = str(form, "id");
  await db
    .update(projects)
    .set({
      approvedBudget: int(form, "approvedBudget"),
      actualExpenditure: int(form, "actualExpenditure"),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id));
  back(
    str(form, "returnTo") === "budget"
      ? "/admin/budget?saved=1"
      : `/admin/projects?edit=${id}`,
  );
}

export async function deleteProject(form: FormData): Promise<void> {
  await requirePermission("content");
  await ensureSchema();
  await db.delete(projects).where(eq(projects.id, str(form, "id")));
  back("/admin/projects");
}

export async function setProjectApproval(form: FormData): Promise<void> {
  await requirePermission("feature");
  await ensureSchema();
  const id = str(form, "id");
  const decision = str(form, "decision");
  const patch =
    decision === "reject"
      ? { published: false, approvalStatus: "rejected" as const }
      : decision === "unpublish"
        ? { published: false, approvalStatus: "pending" as const }
        : { published: true, approvalStatus: "approved" as const };
  await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(projects.id, id));
  back("/admin/projects");
}

/* -------------------------- content: announcements ------------------------- */

export async function saveAnnouncement(form: FormData): Promise<void> {
  await requirePermission("announcements");
  const id = str(form, "id");
  const publishedRaw = str(form, "publishedAt");
  const values = {
    title: str(form, "title"),
    content: str(form, "content"),
    category: str(form, "category") || "Advisory",
    externalUrl: str(form, "externalUrl") || null,
    featured: bool(form, "featured"),
    active: bool(form, "active"),
    publishedAt: publishedRaw ? new Date(publishedRaw) : new Date(),
    updatedAt: new Date(),
  };
  if (!values.title) redirect("/admin/announcements?error=missing");

  if (id) {
    await db.update(announcements).set(values).where(eq(announcements.id, id));
  } else {
    await db.insert(announcements).values(values);
  }
  back("/admin/announcements");
}

export async function deleteAnnouncement(form: FormData): Promise<void> {
  await requirePermission("announcements");
  await db.delete(announcements).where(eq(announcements.id, str(form, "id")));
  back("/admin/announcements");
}

export async function toggleAnnouncement(form: FormData): Promise<void> {
  if (str(form, "flag") === "featured") await requirePermission("feature");
  else await requirePermission("announcements");
  const flag = str(form, "flag") === "featured" ? "featured" : "active";
  const id = str(form, "id");
  const [row] = await db.select().from(announcements).where(eq(announcements.id, id));
  if (row) {
    await db
      .update(announcements)
      .set({ [flag]: !row[flag], updatedAt: new Date() })
      .where(eq(announcements.id, id));
  }
  back("/admin/announcements");
}

/* ------------------------------ finance: budget ---------------------------- */

export async function saveBudget(form: FormData): Promise<void> {
  await requirePermission("finance");
  const total = int(form, "totalBudget");
  const [row] = await db.select().from(budget);
  if (row) {
    await db.update(budget).set({ totalBudget: total, updatedAt: new Date() });
  } else {
    await db.insert(budget).values({ totalBudget: total });
  }
  back("/admin/budget");
}

/* ------------------------- account (main admin only) ---------------------- */

export async function updateAdminCredentials(form: FormData): Promise<void> {
  await requirePermission("account");
  const session = await requireSession();
  const [user] = await db.select().from(users).where(eq(users.id, session.id));
  if (!user) redirect("/admin/account?error=missing");

  const current = String(form.get("currentPassword") ?? "");
  if (!(await verifyPassword(current, user.passwordHash))) {
    redirect("/admin/account?error=password");
  }

  const newEmail = str(form, "newEmail").toLowerCase();
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");

  if (!newEmail && !newPassword) redirect("/admin/account?error=empty");

  const values: { email?: string; passwordHash?: string } = {};

  if (newEmail && newEmail !== user.email) {
    const [clash] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, newEmail));
    if (clash) redirect("/admin/account?error=email");
    values.email = newEmail;
  }

  if (newPassword) {
    if (newPassword.length < 8) redirect("/admin/account?error=short");
    if (newPassword !== confirmPassword) redirect("/admin/account?error=mismatch");
    values.passwordHash = await hashPassword(newPassword);
  }

  if (Object.keys(values).length > 0) {
    await db.update(users).set(values).where(eq(users.id, user.id));
  }
  back("/admin/account?saved=1");
}

/* --------------------- constituency (Google Sheets sync) ------------------- */

export async function saveConstituencySettings(form: FormData): Promise<void> {
  await requirePermission("constituency");
  const sheetId = parseConstituencySheetId(str(form, "sheetUrl"));
  if (!sheetId) redirect("/admin/constituency?error=sheet");
  await ensureSchema();
  await db
    .insert(constituencySettings)
    .values({ id: 1, sheetId })
    .onConflictDoUpdate({ target: constituencySettings.id, set: { sheetId } });
  back("/admin/constituency?saved=1");
}

export async function refreshConstituency(): Promise<void> {
  await requirePermission("constituency");
  await ensureSchema();
  const [settings] = await db.select().from(constituencySettings).limit(1);
  if (!settings?.sheetId) redirect("/admin/constituency?error=sheet");

  const result = await readConstituencySheet(settings.sheetId);
  if (!result.ok) {
    await db
      .update(constituencySettings)
      .set({ lastError: result.reason })
      .where(eq(constituencySettings.id, 1));
    redirect("/admin/constituency?error=refresh");
  }

  await db.delete(constituencyPeriods);
  if (result.periods.length > 0) {
    await db.insert(constituencyPeriods).values(
      result.periods.map(({ label, safe, baha, internet, position }) => ({
        label,
        safe,
        baha,
        internet,
        position,
      })),
    );
  }
  const tabErrors = result.failures
    .map((failure) => `${failure.tab}: ${failure.reason}`)
    .join("\n");
  await db
    .update(constituencySettings)
    .set({
      lastSyncedAt: new Date(),
      lastError: "",
      tabErrors,
      tabCount: result.periods.length,
    })
    .where(eq(constituencySettings.id, 1));
  back("/admin/constituency?synced=1");
}

/* --------------------- roomfinder (Google Sheets + XLSX upload) ------------------- */

export async function saveRoomfinderSettings(form: FormData): Promise<void> {
  await requirePermission("roomfinder");
  await ensureSchema();
  const sheetId = parseRoomfinderSheetId(str(form, "sheetUrl"));
  if (!sheetId) redirect("/admin/roomfinder?error=sheet");
  await db
    .insert(roomfinderSettings)
    .values({ id: 1, sheetId })
    .onConflictDoUpdate({ target: roomfinderSettings.id, set: { sheetId } });
  back("/admin/roomfinder?saved=1");
}

export async function refreshRoomfinder(): Promise<void> {
  await requirePermission("roomfinder");
  await ensureSchema();
  const [settings] = await db.select().from(roomfinderSettings).limit(1);
  if (!settings?.sheetId) redirect("/admin/roomfinder?error=sheet");

  const result = await readRoomfinderSheet(settings.sheetId);
  if (!result.ok) {
    await db
      .update(roomfinderSettings)
      .set({ lastError: result.reason })
      .where(eq(roomfinderSettings.id, 1));
    redirect("/admin/roomfinder?error=refresh");
  }

  // Replace all entries
  await db.delete(roomfinderEntries);
  if (result.entries.length > 0) {
    // Batch insert in chunks to avoid too large payload
    const chunkSize = 200;
    for (let i = 0; i < result.entries.length; i += chunkSize) {
      const chunk = result.entries.slice(i, i + chunkSize).map((e, idx) => ({
        room: e.room,
        day: e.day,
        start: e.start,
        end: e.end,
        course: e.course || null,
        section: e.section || null,
        instructor: e.instructor || null,
        building: e.building || null,
        position: i + idx,
      }));
      await db.insert(roomfinderEntries).values(chunk);
    }
  }

  const tabErrors = result.failures.map((f) => `${f.tab}: ${f.reason}`).join("\n");
  await db
    .update(roomfinderSettings)
    .set({
      lastSyncedAt: new Date(),
      lastError: "",
      tabErrors,
      tabCount: result.tabs.length,
      entryCount: result.entries.length,
    })
    .where(eq(roomfinderSettings.id, 1));

  back("/admin/roomfinder?synced=1");
}

export async function uploadRoomfinderFile(form: FormData): Promise<void> {
  await requirePermission("roomfinder");
  await ensureSchema();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/roomfinder?error=file");
  }

  // Limit file size to ~5MB for Netlify free tier friendliness
  if (file.size > 5_000_000) {
    redirect("/admin/roomfinder?error=large");
  }

  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  let entries: { room: string; day: string; start: string; end: string; course?: string; section?: string; instructor?: string; building?: string }[] = [];
  let failures: { tab: string; reason: string }[] = [];
  let tabs: string[] = [];

  if (name.endsWith(".xlsx")) {
    const result = extractEntriesFromXlsx(buffer);
    entries = result.entries;
    failures = result.failures;
    tabs = result.tabs;
    if (entries.length === 0 && failures.length > 0) {
      // Save error for display
      await db
        .update(roomfinderSettings)
        .set({ lastError: failures.map((f) => `${f.tab}: ${f.reason}`).join("\n") })
        .where(eq(roomfinderSettings.id, 1));
      redirect("/admin/roomfinder?error=parse");
    }
  } else if (name.endsWith(".csv")) {
    // Single CSV — treat as one room? Require room name in form
    const roomHint = str(form, "room") || file.name.replace(/\.csv$/i, "").trim() || "Unknown";
    const text = new TextDecoder().decode(buffer);
    const { entries: csvEntries, invalid } = (() => {
      const rows = parseCsv(text);
      return readEntriesFromRows(rows, roomHint);
    })();
    entries = csvEntries;
    tabs = [roomHint];
    if (invalid > 0) {
      failures.push({ tab: roomHint, reason: `${invalid} rows skipped` });
    }
    if (entries.length === 0) {
      await db
        .update(roomfinderSettings)
        .set({ lastError: `No valid rows in CSV ${file.name}. Expected Day, Start, End.` })
        .where(eq(roomfinderSettings.id, 1));
      redirect("/admin/roomfinder?error=parse");
    }
  } else if (name.endsWith(".json")) {
    try {
      const text = new TextDecoder().decode(buffer);
      const json = JSON.parse(text);
      // Accept either { entries: [...] } or { meta, entries } like public/data file
      const rawEntries = Array.isArray(json) ? json : json.entries;
      if (!Array.isArray(rawEntries)) throw new Error("Invalid JSON");
      for (const e of rawEntries) {
        if (typeof e !== "object" || !e) continue;
        const day = String((e as any).day ?? "").trim();
        const start = String((e as any).start ?? "").trim();
        const end = String((e as any).end ?? "").trim();
        const room = String((e as any).room ?? "").trim();
        if (!day || !start || !end || !room) continue;
        entries.push({
          room,
          day,
          start,
          end,
          course: (e as any).course ? String((e as any).course).trim() : undefined,
          section: (e as any).section ? String((e as any).section).trim() : undefined,
          instructor: (e as any).instructor ? String((e as any).instructor).trim() : undefined,
          building: (e as any).building ? String((e as any).building).trim() : undefined,
        });
      }
      tabs = Array.from(new Set(entries.map((e) => e.room)));
    } catch (err) {
      await db
        .update(roomfinderSettings)
        .set({ lastError: `JSON parse failed: ${(err as Error).message}` })
        .where(eq(roomfinderSettings.id, 1));
      redirect("/admin/roomfinder?error=parse");
    }
  } else {
    redirect("/admin/roomfinder?error=type");
  }

  if (entries.length === 0) {
    redirect("/admin/roomfinder?error=empty");
  }

  await db.delete(roomfinderEntries);
  const chunkSize = 200;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize).map((e, idx) => ({
      room: e.room,
      day: e.day,
      start: e.start,
      end: e.end,
      course: e.course || null,
      section: e.section || null,
      instructor: e.instructor || null,
      building: e.building || null,
      position: i + idx,
    }));
    await db.insert(roomfinderEntries).values(chunk);
  }

  const tabErrors = failures.map((f) => `${f.tab}: ${f.reason}`).join("\n");
  await db
    .update(roomfinderSettings)
    .set({
      lastSyncedAt: new Date(),
      lastError: "",
      tabErrors,
      tabCount: tabs.length,
      entryCount: entries.length,
    })
    .where(eq(roomfinderSettings.id, 1));

  back("/admin/roomfinder?synced=1");
}

export async function clearRoomfinderData(): Promise<void> {
  await requirePermission("roomfinder");
  await ensureSchema();
  await db.delete(roomfinderEntries);
  await db
    .update(roomfinderSettings)
    .set({
      lastSyncedAt: null,
      lastError: "",
      tabErrors: "",
      tabCount: 0,
      entryCount: 0,
    })
    .where(eq(roomfinderSettings.id, 1));
  back("/admin/roomfinder?cleared=1");
}

/* --------------------- site visibility (Head Admin only) ------------------- */

export async function saveSiteVisibility(form: FormData): Promise<void> {
  await requirePermission("site_visibility");
  await ensureSchema();

  // Checkbox: "on" if checked, otherwise missing -> false
  const values = {
    showRoomfinder: bool(form, "showRoomfinder"),
    showAnnouncements: bool(form, "showAnnouncements"),
    showResources: bool(form, "showResources"),
    showTransparency: bool(form, "showTransparency"),
    showProjects: bool(form, "showProjects"),
    showConstituency: bool(form, "showConstituency"),
    showOfficers: bool(form, "showOfficers"),
    showAbout: bool(form, "showAbout"),
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(siteSettings).limit(1);
  if (existing) {
    await db.update(siteSettings).set(values).where(eq(siteSettings.id, 1));
  } else {
    await db.insert(siteSettings).values({ id: 1, ...values });
  }

  back("/admin/site-visibility?saved=1");
}

/* ------------------------------ shared reorder ----------------------------- */

async function moveOrder(
  table: typeof resources | typeof officers,
  id: string,
  dir: number,
  path: string,
): Promise<void> {
  if (!id || (dir !== 1 && dir !== -1)) return back(path);
  const rows = await db
    .select({ id: table.id, displayOrder: table.displayOrder })
    .from(table)
    .orderBy(table.displayOrder);
  const index = rows.findIndex((row) => row.id === id);
  const current = rows[index];
  const swap = rows[index + dir];
  if (!current || !swap) return back(path);
  const temp = current.displayOrder;
  await db.update(table).set({ displayOrder: swap.displayOrder }).where(eq(table.id, current.id));
  await db.update(table).set({ displayOrder: temp }).where(eq(table.id, swap.id));
  back(path);
}
