# rCloud — CSSP Local Student Council

The digital resource & transparency portal of the **CSSP Local Student
Council, Bulacan State University** (SY 2025–2026).

- **Public site** — resources, transparency, projects, constituency, officers,
  announcements. Fully data-driven: everything renders from the database.
- **Admin** (`/admin`, not linked publicly) — role-based management of all
  public content.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **PostgreSQL** via **Drizzle ORM** + `postgres-js` (Neon/Supabase-compatible)
- Deploys to **Netlify** (`netlify.toml` + `@netlify/plugin-nextjs`); set
  `DATABASE_URL` and `AUTH_SECRET` in Netlify environment variables.

## Setup

```bash
npm install
cp .env.example .env          # adjust DATABASE_URL
npm run db:push               # create tables (Drizzle)
npm run db:seed               # seed content + admin accounts
npm run dev                   # or: npm run build && npm run start
```

## Admin accounts (development)

| Account | Email | Password | Access |
| --- | --- | --- | --- |
| Head Admin (Gov & VG) | `headadmin@rcloud.cssp` | `rcloud2026` | Content + Finance + Constituency (full) |
| Moderator (Board Members) | `moderator@rcloud.cssp` | `rcloud2026` | Content only |

Change passwords before going live. Roles/permissions live in
`src/lib/server/permissions.ts`; enforcement happens in every server action
(`requirePermission`) and page guard — not just hidden buttons.

## Architecture

- Schema: `src/lib/server/schema.ts` (users, sessions, resources, officers,
  projects, announcements, budget, constituency_metrics).
- Auth: scrypt password hashing, hashed session tokens in DB, httpOnly
  sameSite=lax cookie (`src/lib/server/auth.ts`).
- Public reads: `src/lib/server/queries.ts` (totals always computed:
  allocated = Σ approved budgets, utilized = Σ expenditures,
  remaining = allocated − utilized; project remaining = approved − actual,
  with admin over-budget warnings).
- Admin mutations: `src/lib/server/actions.ts` (server actions).
- Documents: admins paste external links (Drive/Docs); no large uploads.
  Small images may be uploaded (≤400 KB, stored as data URLs).
- Seed sources (original Carrd content): `src/lib/data/*.ts`.

## Deploy to Netlify (via GitHub)

1. `git init && git add -A && git commit -m "rCloud"` then push to a new GitHub
   repo (or upload the project folder). `.env`, `node_modules` and `.next` are
   git-ignored — they must NOT be uploaded.
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the
   repo. `netlify.toml` already sets the build command and Next.js plugin.
3. Create a free managed Postgres (Neon or Supabase). In Netlify → Site
   configuration → Environment variables, set:
   - `DATABASE_URL` = the pooled Postgres connection string
   - `AUTH_SECRET` = any long random string (`openssl rand -hex 32`)
4. Push the schema + seed once against that database:
   `DATABASE_URL=… npm run db:push && DATABASE_URL=… npm run db:seed`
   (run from any machine with Node; afterwards log in and change the dev
   passwords via the accounts listed above — or ask for an SQL snippet).
5. Deploy. The public site, /admin and the Constituency Sheets sync all work
   serverless; no PHP, no extra services.

## Constituency Check (Google Sheets)

- Flow: Google Form → Google Sheet → rCloud. The Sheet is the only place
  constituency data is edited.
- Admin → Constituency → paste the Sheet link → **Refresh data**.
  Tabs = date/date-ranges (e.g. `JULY 6-12`); new tabs are detected
  automatically, no code change.
- Only the `Total (All Sections)` row is read: column B → Safe, C → Apektado
  ng Baha, E → Walang Internet / Mabagal ang Internet Connection.
  Section names and individual responses are never read, stored or shown.
- Public `/constituency` shows a date selector + the three totals +
  "Last updated". If the Sheet cannot be reached the site keeps the last good
  data and shows "Constituency data is temporarily unavailable" only when
  nothing has ever synced.
- The Sheet must be shared as "Anyone with the link — Viewer" (no API key or
  service account required; the reader only uses the public read endpoints and
  keeps the Sheet URL out of public markup).

## Verified

Headless-browser suite (`/tmp/e2e/test-admin.js` in the build sandbox) covers:
auth redirect + bad login, role-scoped nav, page-level denial for Moderator,
backend denial of the finance server action for Moderator, resource
create/hide/delete → public sync, budget update → transparency sync,
overspend warning, constituency refresh → public sync, project finance math.

---

BulSU CSSP LSC 2025-2026™
