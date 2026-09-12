import { sql } from "drizzle-orm";
import { db } from "./db";

let schemaPromise: Promise<void> | null = null;

/**
 * Apply small, backwards-compatible schema fixes before project queries run.
 *
 * Netlify may start multiple server instances, so the SQL itself must remain
 * idempotent. The promise prevents repeated ALTER TABLE calls within one cold
 * start while still allowing separate instances to initialize safely.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = db
      .execute(sql`
        ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
      `)
      .then(() => undefined);
  }

  return schemaPromise;
}
