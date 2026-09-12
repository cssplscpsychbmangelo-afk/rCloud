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
} from "./schema";
import {
  createSession,
  destroySession,
  requirePermission,
  requireSession,
  hashPassword,
  verifyPassword,
} from "./auth";
import { parseSheetId, readConstituencySheet } from "./constituencySheet";

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

export async function saveProjectDetails(form: FormData): Promise<void> {
  await requirePermission("content");
  const id = str(form, "id");
  let imageUrl = str(form, "imageUrl") || null;
  try {
    const uploaded = await imageData(form, "image");
    if (uploaded) imageUrl = uploaded;
  } catch (error) {
    redirect(`/admin/projects?error=${encodeURIComponent((error as Error).message)}`);
  }
  const dateRaw = str(form, "date");
  const values = {
    name: str(form, "name"),
    description: str(form, "description"),
    category: str(form, "category") || "Program",
    status: str(form, "status") || "Pending",
    date: dateRaw ? new Date(dateRaw) : null,
    projectLead: str(form, "projectLead") || null,
    imageUrl,
    documentLinks: str(form, "documentLinks"),
    transparencyNotes: str(form, "transparencyNotes"),
    published: bool(form, "published"),
    updatedAt: new Date(),
  };
  if (!values.name) redirect("/admin/projects?error=missing");

  if (id) {
    await db.update(projects).set(values).where(eq(projects.id, id));
  } else {
    await db.insert(projects).values(values);
  }
  back(id ? `/admin/projects?edit=${id}` : "/admin/projects");
}

/**
 * Finance-only: approved budget + actual expenditure per project.
 * Editable from Projects and from the Budget section (returnTo=budget).
 */
export async function saveProjectFinance(form: FormData): Promise<void> {
  await requirePermission("finance");
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
  await db.delete(projects).where(eq(projects.id, str(form, "id")));
  back("/admin/projects");
}

export async function toggleProject(form: FormData): Promise<void> {
  await requirePermission("content");
  const id = str(form, "id");
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  if (row) {
    await db
      .update(projects)
      .set({ published: !row.published, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }
  back("/admin/projects");
}

/* -------------------------- content: announcements ------------------------- */

export async function saveAnnouncement(form: FormData): Promise<void> {
  await requirePermission("content");
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
  await requirePermission("content");
  await db.delete(announcements).where(eq(announcements.id, str(form, "id")));
  back("/admin/announcements");
}

export async function toggleAnnouncement(form: FormData): Promise<void> {
  await requirePermission("content");
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

/**
 * Changes the signed-in admin's sign-in email and/or password.
 *
 * Guarded by the "account" permission (Head Admin only) and by a check of the
 * current password, so nobody can take over an account with a stale session.
 * The current email and password are never displayed or returned.
 */
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
  const sheetId = parseSheetId(str(form, "sheetUrl"));
  if (!sheetId) redirect("/admin/constituency?error=sheet");
  await db
    .insert(constituencySettings)
    .values({ id: 1, sheetId })
    .onConflictDoUpdate({ target: constituencySettings.id, set: { sheetId } });
  back("/admin/constituency?saved=1");
}

export async function refreshConstituency(): Promise<void> {
  await requirePermission("constituency");
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
