import { createHash, randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { sessions, users } from "./schema";
import { roleHasPermission, type Permission } from "./permissions";
import { hashPassword, verifyPassword } from "./passwords";

export { hashPassword, verifyPassword };

const COOKIE = "rcloud_session";
const SESSION_DAYS = 7;

/* ------------------------- diagnostics (temporary) ------------------------ */

const DEBUG_LOG = "/home/user/rcloud/auth-debug.log";
function alog(msg: string): void {
  const line = `${new Date().toISOString()} ${msg}`;
  try {
    appendFileSync(DEBUG_LOG, line + "\n");
  } catch {
    /* read-only filesystems (Netlify) are fine — see console below */
  }
  try {
    console.info(`[auth] ${line}`);
  } catch {
    /* never break a request */
  }
}

/* -------------------------------- sessions -------------------------------- */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);

  await db.insert(sessions).values({ userId, tokenHash, expiresAt });
  alog(`createSession: user=${userId} token=${token.slice(0, 8)}…`);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    partitioned: true,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) {
    alog("getSession: NO COOKIE sent with request");
    return null;
  }

  const fp = token.slice(0, 8);
  const tokenHash = createHash("sha256").update(token).digest("hex");

  let row:
    | { userId: string; name: string; email: string; role: string; expiresAt: Date }
    | undefined;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      [row] = await db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.tokenHash, tokenHash));
      break;
    } catch (err) {
      alog(`getSession: db error (attempt ${attempt}): ${(err as Error).message}`);
      if (attempt === 2) throw err;
    }
  }

  if (!row) {
    alog(`getSession: token ${fp}… NOT IN DB`);
    return null;
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    alog(`getSession: token ${fp}… EXPIRED at ${row.expiresAt.toISOString()}`);
    return null;
  }
  return { id: row.userId, name: row.name, email: row.email, role: row.role };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  alog(`destroySession: token=${token ? `${token.slice(0, 8)}…` : "none"}`);
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  store.set(COOKIE, "", { httpOnly: true, sameSite: "none", secure: true, partitioned: true, path: "/", maxAge: 0 });
}

/* ------------------------------ authorization ----------------------------- */

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    return redirect("/admin/login");
  }
  return session;
}

/** Backend-level permission enforcement — never rely on hidden buttons alone. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const session = await requireSession();
  if (!roleHasPermission(session.role, permission)) {
    const { redirect } = await import("next/navigation");
    return redirect("/admin?denied=1");
  }
  return session;
}
