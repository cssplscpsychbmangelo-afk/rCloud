# rCloud — CSSP Local Student Council

The digital resource & transparency portal of the **CSSP Local Student
Council, Bulacan State University** (AY 2026–2027).

- **Public site** — resources, transparency, projects, constituency, officers,
  announcements. Fully data-driven: everything renders from the database.
- **Admin** (`/admin`, not linked publicly) — role-based management of all
  public content. The admin panel has its own navigation and never renders the
  public nav or footer.

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
| Head Admin (Gov & VG) | `headadmin@rcloud.cssp` | `rcloud2026` | Content + Finance + Constituency + Account (full) |
| Moderator (Board Members) | `moderator@rcloud.cssp` | `rcloud2026` | Content only |

Change passwords before going live (**Admin → Account**, main admin only, or
re-run the seed). Roles/permissions live in `src/lib/server/permissions.ts`;
enforcement happens in every server action (`requirePermission`) and page guard
— not just hidden buttons.

### Admin navigation

- `src/lib/adminNav.ts` is the single source for both the admin sidebar and the
  dashboard's "Admin sections" grid, filtered by the signed-in role, so each
  account only ever sees admin pages it can actually open.
- Head Admin: Dashboard, Resources, Officers, Projects, Announcements, Budget,
  Constituency, Account. Moderator: Dashboard, Resources, Officers, Projects,
  Announcements.
- The admin area lives outside the `(site)` route group, so no public-site link
  (Home/Resources/Transparency/…, footer) appears inside `/admin`.
- **Account** (`/admin/account`, `account` permission) lets the Head Admin change
  the admin sign-in email and password. It requires the current password and
  never displays the current email or password.
- **Projects** (`/admin/projects`, `content` permission) adds a project with
  only what matters: name, description, status and an optional external photo
  link — no image upload. The form shows the project's **Approved / Utilized /
  Remaining** balance (₱0 until it is funded in Budget), and Head Admins
  Approve or Reject Board-Member submissions in one click.
- **Budget** (`/admin/budget`, `finance` permission) configures the total LSC
  budget *and* every project's approved budget / expenditure inline; allocated,
  utilized and remaining stay computed from published projects.
- The sign-in page never prints account names, emails or passwords — it is
  publicly reachable.

## Terminology / academic year

- `site.term` (`src/lib/data/site.ts`) is the sitting council's academic year:
  **2026–2027**. It drives the Officers page, the home "Your council, AY …"
  heading and the Transparency budget period.
- `site.footerMark` stays **BulSU CSSP LSC 2025-2026™** — the term the portal
  was originally built under.

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
- Documents & photos: admins paste external links (Drive/Docs); no large
  uploads. Only officer portraits may be uploaded (≤400 KB, stored as data
  URLs) — projects take an optional external photo link instead.
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

## Constituency Check PDF report

One fixed report template for every period (`src/lib/server/constituencyReport.ts`,
drawn with `pdf-lib`). Layout, typography, colours, logo placement, section
order, captions and footer are identical in every PDF — only the selected
period, the received figures, the calculated analysis, the optional student
details and the timestamps change.

- Sections (always in this order): header (logo + CSSP LOCAL STUDENT COUNCIL /
  CONSTITUENCY CHECK REPORT / Combined Data from CSSP Classes), Report Period,
  optional Student Information, Constituency Data, Objective Data Analysis,
  Data Source Statement, Last Updated, footer.
- `/api/constituency/report` (POST `{ period, name?, section? }`) reads the
  selected tab from the Sheet (falling back to the last synced figures if the
  Sheet is unreachable), runs the fixed analysis rules and streams the PDF as
  an attachment: `CSSP_LSC_Constituency_Check_<Period>.pdf`.
- The analysis (`src/lib/server/constituencyAnalysis.ts`) is arithmetic only —
  no narrative, no interpretation, no estimation. Total Reported Responses =
  Safe + Apektado ng Baha + Walang Internet; shares are
  (value / Total Reported Responses) x 100 to one decimal. Categories are
  treated as independently reported: combined figures are labelled as sums of
  reported responses, never as counts of unique students. Calculations the data
  cannot support (e.g. percentages when the total is 0) are omitted.
- Name and section are optional and never auto-filled. Whatever the student
  types is shown as entered; blank fields are omitted from the PDF entirely.
- Privacy: only the three consolidated totals ever reach the report — no
  individual responses, names, student numbers, emails, phone numbers or
  per-section rows.
- Cost: browsing the site costs the same as before — the report endpoint only
  runs when someone clicks Generate/Download. Each report is one ~2 KB Google
  Sheets request plus a ~70 KB PDF; the logo is read and downscaled once per
  server process (512 px → 256 px, still ~370 dpi when printed) instead of
  being embedded full-size, which keeps a report at ~70 KB rather than ~213 KB.
  Logo resolution prefers the on-disk `public/` file, then the app's own
  origin, and finally falls back to a pre-downscaled copy bundled in the
  server code — so the report can always be prepared even when a serverless
  host rewrites `request.url` and blocks the self-fetch.
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
