import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** Pure scrypt password hashing — usable in app code and CLI scripts alike. */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/**
 * A hash of a random value nobody knows.
 *
 * Sign-in verifies *something* against scrypt even when the email is not
 * registered, so response time cannot be used to find out which addresses have
 * admin accounts. Computed once per instance on first use.
 */
let decoy: string | null = null;
export function decoyPasswordHash(): string {
  if (!decoy) decoy = hashPassword(randomBytes(32).toString("hex"));
  return decoy;
}
