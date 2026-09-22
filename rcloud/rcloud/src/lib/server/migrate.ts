import { sql } from "drizzle-orm";
import { db } from "./db";

let schemaPromise: Promise<void> | null = null;

/**
 * Apply small, backwards-compatible schema fixes before project queries run.
 *
 * Netlify may start multiple server instances, so the SQL itself must remain
 * idempotent. The promise prevents repeated ALTER TABLE calls within one cold
 * start while still allowing separate instances to initialize safely.
 *
 * Resilient to missing DATABASE_URL / DB errors so that `next build` succeeds
 * even when Netlify env vars are not set for a preview site.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        // Legacy: approval_status column
        await db.execute(sql`
          ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
        `);

        // Roomfinder settings table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS roomfinder_settings (
            id integer PRIMARY KEY DEFAULT 1,
            sheet_id text NOT NULL DEFAULT '',
            last_synced_at timestamp,
            last_error text NOT NULL DEFAULT '',
            tab_errors text NOT NULL DEFAULT '',
            tab_count integer NOT NULL DEFAULT 0,
            entry_count integer NOT NULL DEFAULT 0
          )
        `);

        // Older databases created roomfinder_settings before these columns
        // existed; CREATE TABLE IF NOT EXISTS never adds them, and every
        // select/update against the table then fails — which silently drops
        // the site back to the placeholder schedule even after an upload.
        await db.execute(sql`
          ALTER TABLE roomfinder_settings
          ADD COLUMN IF NOT EXISTS sheet_id text NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS last_synced_at timestamp,
          ADD COLUMN IF NOT EXISTS last_error text NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS tab_errors text NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS tab_count integer NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS entry_count integer NOT NULL DEFAULT 0
        `);

        // Roomfinder entries table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS roomfinder_entries (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            room text NOT NULL,
            day text NOT NULL,
            start text NOT NULL,
            "end" text NOT NULL,
            course text,
            section text,
            instructor text,
            building text,
            position integer NOT NULL DEFAULT 0
          )
        `);

        await db.execute(sql`
          ALTER TABLE roomfinder_entries
          ADD COLUMN IF NOT EXISTS course text,
          ADD COLUMN IF NOT EXISTS section text,
          ADD COLUMN IF NOT EXISTS instructor text,
          ADD COLUMN IF NOT EXISTS building text,
          ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0
        `);

        // Officer duty / consultation hours (availability schedule)
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS officer_availability (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            officer_id text NOT NULL,
            kind text NOT NULL DEFAULT 'weekly',
            day text NOT NULL DEFAULT '',
            "date" text NOT NULL DEFAULT '',
            start text NOT NULL,
            "end" text NOT NULL,
            location text NOT NULL DEFAULT '',
            note text NOT NULL DEFAULT '',
            display_order integer NOT NULL DEFAULT 0,
            created_at timestamp NOT NULL DEFAULT now()
          )
        `);

        // Site visibility settings
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS site_settings (
            id integer PRIMARY KEY DEFAULT 1,
            show_roomfinder boolean NOT NULL DEFAULT true,
            show_announcements boolean NOT NULL DEFAULT true,
            show_resources boolean NOT NULL DEFAULT true,
            show_transparency boolean NOT NULL DEFAULT true,
            show_projects boolean NOT NULL DEFAULT true,
            show_constituency boolean NOT NULL DEFAULT true,
            show_officers boolean NOT NULL DEFAULT true,
            show_about boolean NOT NULL DEFAULT true,
            updated_at timestamp NOT NULL DEFAULT now()
          )
        `);

        // Ensure default row exists for site_settings
        await db.execute(sql`
          INSERT INTO site_settings (id) VALUES (1)
          ON CONFLICT (id) DO NOTHING
        `);

        // Ensure default row exists for roomfinder_settings
        await db.execute(sql`
          INSERT INTO roomfinder_settings (id) VALUES (1)
          ON CONFLICT (id) DO NOTHING
        `);
      } catch (err) {
        // During build without DATABASE_URL, silently ignore — runtime will
        // handle missing DB via fallbacks in queries/siteVisibility.
        console.warn("[rCloud] ensureSchema skipped (DB not available):", (err as Error).message);
      }
    })();
  }

  return schemaPromise;
}
