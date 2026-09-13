import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// Serverless-friendly: postgres-js with conservative connection limits.
// prepare:false keeps prepared statements client-side so Neon's connection
// pooler (PgBouncer) works as well as direct connections.
// PGPOOL_MAX overrides the pool size (3 by default) — useful for local
// databases that only handle one connection at a time.

// During build (Netlify) DATABASE_URL may be missing for some sites.
// We allow the module to load with a dummy URL so that `next build` succeeds;
// runtime queries will then fail gracefully and fall back to placeholders/defaults
// via try/catch in callers (siteVisibility, queries, API routes).
const effectiveUrl = connectionString || "postgres://dummy:dummy@localhost:5432/dummy";

if (!connectionString) {
  console.warn(
    "[rCloud] DATABASE_URL is not set — using dummy DB for build. Runtime will fall back to placeholders. Configure DATABASE_URL in .env or Netlify env vars for full functionality.",
  );
}

const poolMax = Number(process.env.PGPOOL_MAX ?? 3);
const client = postgres(effectiveUrl, {
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 3,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  prepare: false,
});

export const db = drizzle(client, { schema });
export { schema };
