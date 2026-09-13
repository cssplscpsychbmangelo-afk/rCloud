# Netlify Free Tier — Data-Friendliness Assessment (after Roomivility Sheet + Visibility Toggles)

Date: 2026-09-13
Branch: arena/01a09996-rcloud

## Summary
**Yes — the site remains data-friendly for Netlify free tier** after adding:
- Roomivility Google Sheet / XLSX upload (tabs = Room No.)
- Head-admin page to sync it
- Site visibility toggles (hide/show pages + homepage sections)
- Swapped announcement ↔ roomivility order on homepage

All changes keep the core principle: **one small fetch, then everything local in the browser**. No per-search requests, no heavy assets, no background polling.

---

## 1. What changed, bandwidth-wise

### Roomivility schedule source
- **Before**: client fetched `/data/cssp-schedule.json` (static, ~15 KB, CDN cached, `max-age=300, stale-while-revalidate=604800`).
- **After**: client tries `GET /api/roomfinder/schedule` first.
  - If DB empty (no custom sheet yet): API returns `204 No Content` (~0 bytes) → client falls back to static JSON. Cost = 1 extra tiny request on first load, then cached.
  - If DB has entries (e.g. 200 entries, 10 rooms): API returns JSON ~20-40 KB, with `Cache-Control: public, max-age=300, stale-while-revalidate=3600`. Subsequent loads hit Netlify CDN cache, not DB.
  - **Net effect**: +1 API call per visit when custom sheet exists, otherwise same as before. Payload size similar to old static file.

**Why still friendly:**
- No per-keystroke search hits server — `useSchedule` caches in `localStorage` (`rcloud.roomfinder.schedule.v1`) and all filtering (`searchEntries`, `allRoomsAt`, etc.) runs client-side.
- 5-minute cache + 1-hour stale-while-revalidate means at most ~288 origin hits/day per edge node for schedule, far below free tier.
- 5 MB upload limit for XLSX/CSV/JSON prevents abuse.

### Site visibility
- New table `site_settings` — 1 row, 8 booleans, ~100 bytes.
- `getSiteVisibility()` does `SELECT ... LIMIT 1` per request. Wrapped in `ensureSchema()` which memoizes DDL after first cold start.
- Nav filtering happens **server-side** (`SiteNav` server component) before HTML is sent — hidden links never reach client.
- Homepage now conditionally renders sections; hidden sections skip their UI. (Further optimization possible: skip their DB queries entirely — see “Future micro-optimizations”.)

**Cost**: +1 tiny DB query per public page load. Negligible vs. existing queries (`getResources`, `getProjects`, etc.). No extra client JS.

### Admin pages
- `/admin/roomfinder` and `/admin/site-visibility` are admin-only, not public. They add 1-2 DB queries per admin visit.
- No impact on public bandwidth.

### Homepage order swap
- Announcements now above Roomivility. No data impact — same components, just reordered.

---

## 2. Netlify Free Limits Check

| Limit | Free Tier | This Site Usage (est.) |
|-------|-----------|------------------------|
| Bandwidth | 100 GB/month | < 1 GB/month even with 10k visits (each visit ~200-400 KB HTML+JS+JSON, CDN cached) |
| Build minutes | 300 min/month | Build ~1-2 min, no extra dependencies added (`fflate` already present) |
| Function invocations | 125k/month | Each page is a function. Roomfinder API adds 1 per visit when custom sheet exists. Even 10k visits = 10k invocations — well below limit |
| Function runtime | 100 hrs/month | Roomfinder sheet sync (Google fetch + CSV parse) ~2-5 sec per refresh, admin-only, rare |
| DB (Neon) | Depends on Neon free tier | 3 new tables, tiny rows. `roomfinder_entries` max a few hundred rows. No indexes bloat |

**No new heavy dependencies**: `fflate` already used for Constituency Sheet. XLSX parsing reuses it with regex XML parsing — no `xlsx` npm package needed.

---

## 3. Placeholders retained
- If `roomfinder_entries` empty, API returns 204 → `useSchedule` falls back to `public/data/cssp-schedule.json` (existing placeholder).
- Admin UI shows “Placeholders from /data/... are active” until first sync.
- “Clear & use placeholders” button deletes custom entries and resets settings, reverting to placeholders instantly.

---

## 4. Room detection (tabs = Room No.)
- `listSheetTabs()` reads `xl/workbook.xml` from XLSX export (Google Sheets export) — same method as Constituency.
- Tab name is used verbatim as room number (trimmed). “Room 201”, “201”, “RM 201” all work; search normalizes via `roomKey()`.
- Inside each tab, flexible header detection: Day, Start, End required; Course, Section, Instructor, Building optional.
- Invalid rows skipped and reported per-tab in admin UI (`tabErrors`).

---

## 5. Future micro-optimizations (optional, not required for free tier)

1. **Homepage conditional fetching**: Currently `HomePage` fetches all resources/projects/officers even if hidden. Could fetch visibility first, then only fetch visible sections:
   ```ts
   const visibility = await getSiteVisibility();
   const [resources, projects, ...] = await Promise.all([
     visibility.showResources ? getFeaturedResources() : Promise.resolve([]),
     ...
   ]);
   ```
   Saves 2-3 DB queries when many sections hidden.

2. **Cache site_settings in memory**: Add 60-sec in-memory cache to avoid 1 DB hit per request (already memoized DDL, but SELECT still runs).

3. **API cache tag**: Use Next.js `revalidateTag('roomfinder')` and `revalidatePath` after sync, so CDN invalidates only when admin syncs.

All optional — current usage already well within free tier.

---

## 6. Conclusion

- **Bandwidth**: unchanged or +~20 KB per visit when custom sheet used.
- **Function invocations**: +1 per visit (roomfinder API) when custom sheet exists, 0 when placeholders.
- **Build**: no extra deps, same build time.
- **DB**: 3 tiny tables, no bloat.
- **UX**: placeholders stay until admin syncs, tabs auto-detected as room numbers, visibility toggles work for nav + homepage.

**Verdict: SAFE for Netlify free account.** No risk of hitting limits under normal student traffic (even 5k-10k monthly visits).

---

## How to use new features

### Roomivility Sheet
1. Admin → Roomivility (Head Admin only)
2. Option 1: Paste Google Sheet link (share as “Anyone with link — Viewer”). Tabs = Room No. First row headers: Day | Start | End | Course | Section | Instructor | Building. Example: `Monday | 08:00 | 09:30 | PSY 101 | BSP 1A`
3. Press “Save Sheet link” then “Refresh from Sheet”. Site auto-detects room numbers from tab names.
4. Option 2: Upload `.xlsx` (tabs = rooms) or `.csv` (single room) or `.json` (same shape as `public/data/cssp-schedule.json`). Max 5 MB.
5. Preview shows first 200 entries. Errors per tab shown below.

### Site Visibility
1. Admin → Site Visibility (Head Admin only)
2. Uncheck pages to hide from nav + homepage. Home always visible.
3. Save — layout revalidates immediately, no deploy needed.

### Homepage order
- Announcements section now appears **above** Roomivility teaser per request.
