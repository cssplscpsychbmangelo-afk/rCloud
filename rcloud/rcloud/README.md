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

## Security

Short version — the full policy, the honest gaps and the ordered next steps are
in [`../../SECURITY.md`](../../SECURITY.md).

- **Website armour.** `src/lib/security/policy.ts` builds the CSP
  (`frame-ancestors 'none'` — no other site may frame rCloud — plus
  `object-src`/`frame-src 'none'`, `base-uri`/`form-action 'self'`), HSTS,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-*` and
  `X-Robots-Tag`. `next.config.ts` applies them to every response the Next.js
  runtime produces, `netlify.toml` and `public/_headers` carry the identical
  values for everything the CDN serves. `npm run check:headers` fails when the
  copies drift.
- **Copycat protection.** Self-referential canonical URLs + `metadataBase`,
  `robots.txt` (`/admin` and `/api` disallowed), `sitemap.xml`, schema.org
  `Organization` data, `noindex` on deploy previews and the admin area, and an
  "official site / report a copy" line in the footer once
  `NEXT_PUBLIC_SITE_URL` is set.
- **Sign-in.** scrypt with per-password salt and constant-time comparison,
  random session tokens stored only as SHA-256 hashes, `HttpOnly`/`Secure`/
  `SameSite=Lax` cookie, in-memory rate limiting (6 per account / 20 per address
  per 15 min), decoy-hash verification so unknown emails cost the same time,
  one generic error message, no sign-up, permissions enforced in every server
  action.
- **Expensive endpoints.** The constituency PDF report is rate limited
  (15 per 10 min per address, `Retry-After`) with a 4 KB body cap.
- **Diagnostics.** Sign-in logging is off unless `RCLOUD_AUTH_DEBUG=1` is set
  locally, and never prints tokens, hashes or emails.

## Deploy to Netlify (via GitHub)

1. `git init && git add -A && git commit -m "rCloud"` then push to a new GitHub
   repo (or upload the project folder). `.env`, `node_modules` and `.next` are
   git-ignored — they must NOT be uploaded.
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the
   repo. `netlify.toml` already sets the build command and Next.js plugin.
3. Create a free managed Postgres (Neon or Supabase). In Netlify → Site
   configuration → Environment variables, set:
   - `DATABASE_URL` = the pooled Postgres connection string
   - `NEXT_PUBLIC_SITE_URL` = the site's public origin, e.g.
     `https://rcloud.netlify.app` — this is what the canonical `<link>`, the
     sitemap, the footer's "official site" line and the anti-copycat
     declarations are built from
   - `AUTH_SECRET` = any long random string (`openssl rand -hex 32`); the
     session implementation does not read it today, it is kept for future
     signed-token work. All three are placeholders in `.env.example`.
4. Push the schema + seed once against that database:
   `DATABASE_URL=… npm run db:push && DATABASE_URL=… npm run db:seed`
   (run from any machine with Node; afterwards log in and change the dev
   passwords via the accounts listed above — or ask for an SQL snippet).
5. Deploy. The public site, /admin and the Constituency Sheets sync all work
   serverless; no PHP, no extra services.
6. Change both seeded admin passwords (Admin → Account) before announcing the
   URL, then verify the security headers reached production:

   ```bash
   curl -sI https://<your-site>/ | grep -iE 'content-security|x-frame|strict-transport'
   npm run check:headers        # keeps the three copies of the rules in sync
   ```

   Full checklist and rationale: [`../../SECURITY.md`](../../SECURITY.md).

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
  runs when someone clicks Generate/Download. Each report is one Google Sheets
  request plus a ~73 KB PDF; the logo is embedded at 256 px (still ~370 dpi
  when printed) instead of full-size, which keeps a report at ~73 KB rather
  than ~213 KB.
- The Sheet must be shared as "Anyone with the link — Viewer" (no API key or
  service account required; the reader only uses the public read endpoints and
  keeps the Sheet URL out of public markup).

### Why the report comes back quickly

Generating a report is the only rCloud request that does real work, so it is
kept short and bounded:

- **The logo never costs the request anything.** The pre-downscaled 256 px PNG
  is shipped inside the server bundle (`src/lib/server/reportLogoBase64.ts`)
  and decoded from base64 — no 512 px decode/resize on the request path. If
  that copy is ever missing, the on-disk `public/` file is used (and downscaled
  once per process), then the app's own origin. All three paths were verified to
  produce the same PNG bytes.
- **The Sheet read is bounded and memoized.** The selected tab is read with a
  4 s budget (the last synced figures are always a valid fallback, so a slow
  Google must never become a slow report), the result is reused for 60 s, and
  concurrent requests for the same tab share one in-flight request. When the
  stored totals were synced in the last 2 minutes, the round-trip is skipped
  entirely — the numbers cannot have changed.
- **Only the fonts that are drawn are embedded** (Helvetica + Helvetica-Bold).
  Every extra standard font cost a decode on the process's first report and
  travelled inside every generated PDF.
- Both optimizations are layout-neutral: with the old and new code rendering
  the same input, every PDF content stream is byte-identical and only the
  unused font object is gone.

## Roomivility (CSSP Room Finder)

**Roomivility** — "room availability" — is the student-facing **schedule
viewer** at `/room-finder` (also linked in the navigation and featured on the
homepage). Students can find rooms free at a
given day/time, look up where a class meets, browse a room's day timeline and
view the full schedule as a sortable table. It is deliberately **not** a
booking or room-management system — no accounts, no tracking, no writes.

- **Static data, client-side everything.** The schedule lives in
  `public/data/cssp-schedule.json` (served at `/data/cssp-schedule.json`).
  The interface fetches that one small file per visit; searching, filtering,
  sorting and availability checks all run in the browser. No database, no
  per-search requests, no polling/WebSockets — effectively free to host on
  Netlify's free tier.
- **Placeholders retire after the first upload.** While the council has no
  schedule of its own, `/room-finder` and the homepage teaser show a clearly
  labelled sample from `public/data/cssp-schedule.json`. The moment a Google
  Sheet is synced or an .xlsx / .csv / .json file is uploaded, that sample is
  retired: the page reads only the uploaded schedule, any sample copy cached in
  a visitor's browser is discarded, and a network failure shows an honest
  "could not be loaded" state instead of sample rooms. "Clear & use
  placeholders" in Admin — Roomivility is the only way back.
- **Offline-friendly.** After the first successful load the dataset is cached
  in `localStorage`; if the connection drops the Room Finder keeps working
  from the cache and clearly shows "Using the most recently loaded schedule."
- **Honest statuses.** 🟢 Available / 🔴 Occupied / ⚪ No scheduled class are
  derived only from the published schedule, and the UI states that
  availability does not guarantee physical access. Days and time slots shown
  are derived from the dataset — nothing is fabricated, and empty states say
  so.
- **Privacy.** No accounts, no search history, no analytics on room lookups;
  the only storage is the schedule cache described above.

### Updating the schedule (administrator workflow)

Two ways, in order of preference:

1. **Admin — Roomivility** (recommended, no redeploy): save the official Google
   Sheet link (tabs = Room No.) or upload an `.xlsx` / `.csv` / `.json` file,
   then refresh. Syncing retires the placeholder sample automatically.
2. **Edit `public/data/cssp-schedule.json`** and redeploy. This only applies
   while the council has not uploaded a schedule of its own — the file is
   the fallback shown before the first sync, not a second source of truth.

```json
{
  "meta": {
    "updated": "2026-09-07",
    "source": "Office of the College Registrar — 1st Semester AY 2026–2027",
    "term": "1st Semester, AY 2026–2027",
    "sample": false,
    "stale": false
  },
  "entries": [
    { "day": "Monday", "start": "08:00", "end": "09:30",
      "course": "PSY 101", "section": "BSP 3A", "room": "301" }
  ]
}
```

- `meta.updated` / `meta.source` are displayed verbatim as **SCHEDULE
  UPDATED** / **SOURCE**. Set `"stale": true` to show the "Schedule may have
  changed" warning. Always keep the `source` value pointing at the real
  origin of the data that is loaded.
- `course`, `section`, `instructor`, `building` are optional per entry and
  rendered only when present. Never add fields the official source does not
  have — the interface shows exactly what the file contains.
- The file is fetched with short edge caching (`netlify.toml`:
  `max-age=300, stale-while-revalidate`), so updates propagate within minutes
  without a rebuild-heavy workflow.

## Verified

Headless-browser suite (`/tmp/e2e/test-admin.js` in the build sandbox) covers:
auth redirect + bad login, role-scoped nav, page-level denial for Moderator,
backend denial of the finance server action for Moderator, resource
create/hide/delete → public sync, budget update → transparency sync,
overspend warning, constituency refresh → public sync, project finance math.

---

BulSU CSSP LSC 2025-2026™
