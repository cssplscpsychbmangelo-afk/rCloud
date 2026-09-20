import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { db } from "./db";
import { sessions, users } from "./schema";
import { roleHasPermission, type Permission } from "./permissions";
import { hashPassword, verifyPassword } from "./passwords";

export { hashPassword, verifyPassword };

const COOKIE = "rcloud_session";
const SESSION_DAYS = 7;

/**
 * Diagnostics.
 *
 * Sign-in used to write a debug log to a hard-coded local path and print the
 * first characters of every session token. That is exactly the kind of detail
 * that must never end up in a log file that ships with the site, so it is now
 * off by default and can only be turned on deliberately with
 * `RCLOUD_AUTH_DEBUG=1` (local troubleshooting only). Tokens, password hashes
 * and emails are never written, even then.
 */
function authDebug(message: string): void {
  if (process.env.RCLOUD_AUTH_DEBUG !== "1") return;
  console.info(`[auth] ${new Date().toISOString()} ${message}`);
}

/* -------------------------------- sessions -------------------------------- */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Session cookie attributes.
 *
 * Production: `HttpOnly` (no script can read it), `Secure` (HTTPS only),
 * `SameSite=Lax` (the browser refuses to attach it to cross-site POSTs, which
 * is what makes CSRF against the admin area ineffective) and a path of `/`.
 *
 * Development: the Arena live preview renders the app inside a cross-site
 * iframe, so a `Lax` cookie would simply not be sent there. The relaxed
 * `SameSite=None; Partitioned` variant is therefore kept for `next dev` only —
 * it never applies to the deployed council site.
 */
function sessionCookieOptions(maxAge: number) {
  const dev = process.env.NODE_ENV !== "production";
  return dev
    ? {
        httpOnly: true,
        sameSite: "none" as const,
        secure: true,
        partitioned: true,
        path: "/",
        maxAge,
      }
    : {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: true,
        path: "/",
        maxAge,
      };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);

  await db.insert(sessions).values({ userId, tokenHash, expiresAt });

  // Housekeeping: drop rows that can no longer be used. Best-effort only —
  // a failure here must never stop a legitimate sign-in.
  try {
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  } catch {
    /* ignore */
  }

  authDebug(`createSession: user=${userId} (token never logged)`);

  const store = await cookies();
  store.set(COOKIE, token, sessionCookieOptions(SESSION_DAYS * 24 * 3600));
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

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
      authDebug(`getSession: db error (attempt ${attempt}): ${(err as Error).message}`);
      if (attempt === 2) throw err;
    }
  }

  if (!row) {
    authDebug("getSession: unknown token — session not found");
    return null;
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    authDebug(`getSession: expired session for user=${row.userId}`);
    return null;
  }
  return { id: row.userId, name: row.name, email: row.email, role: row.role };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  // Same attributes as when it was set, otherwise browsers keep the old value.
  store.set(COOKIE, "", sessionCookieOptions(0));
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
