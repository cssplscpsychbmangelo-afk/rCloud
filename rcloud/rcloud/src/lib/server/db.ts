import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Configure it in .env (local) or Netlify environment variables.",
  );
}

// Serverless-friendly: postgres-js with conservative connection limits.
// prepare:false keeps prepared statements client-side so Neon's connection
// pooler (PgBouncer) works as well as direct connections.
// PGPOOL_MAX overrides the pool size (3 by default) — useful for local
// databases that only handle one connection at a time.
const poolMax = Number(process.env.PGPOOL_MAX ?? 3);
const client = postgres(connectionString, {
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 3,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  prepare: false,
});

export const db = drizzle(client, { schema });
export { schema };
