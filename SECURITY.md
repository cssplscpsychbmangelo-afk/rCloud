# Security policy — rCloud

**rCloud** is the digital resource & transparency portal of the **CSSP Local
Student Council, Bulacan State University** (`cssplscpsychbmangelo-afk/rCloud`).

This document is for two audiences: anyone who finds a problem with the site,
and the council officers who run it. It lists what is protected today, what is
*not* protected yet, and the order in which the remaining work is worth doing.

---

## 1. Reporting a vulnerability

Please **do not** open a public GitHub issue for a security problem.

| | |
| --- | --- |
| Email | `cssplsc.bulsusg@gmail.com` (subject: `SECURITY — rCloud`) |
| Facebook | [CSSP Local Student Council](https://www.facebook.com/cssplsc.bulsusg) — message the page |
| Machine-readable contact | `https://<the site's address>/.well-known/security.txt` |

In your report, include what you found, the URL or file, the steps to reproduce
it, and what an attacker could do with it. Screenshots help.

What to expect: acknowledgement within a few days (this is a student council,
not a company with a security team), a fix or a decision as soon as the officers
can review it, and credit in this file if you want it. Please give us a
reasonable chance to fix the issue before publishing anything.

**Especially welcome:** fake copies of rCloud, phishing pages that imitate the
council, exposed credentials or documents, and anything that lets someone change
site content without an admin account.

---

## 2. What is protected today

### 2.1 Website armour — HTTP security headers

Every response from the site carries the headers below. They are the cheapest
and highest-value protection available: they are enforced by the visitor's
browser, so they work even if the server is never touched.

| Header | What it stops |
| --- | --- |
| `Content-Security-Policy` (`frame-ancestors 'none'`) | Another website embedding rCloud in a frame — the classic way a clone wraps the real sign-in page in its own page. |
| `X-Frame-Options: DENY` | The same protection for old browsers that ignore `frame-ancestors`. |
| `Content-Security-Policy` (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-src 'none'`, `connect-src 'self'`) | Injected third-party scripts, plugins/embeds, `<base>` hijacking, and forms or scripts that would ship a student's input to an attacker's domain. |
| `Strict-Transport-Security` | Downgrade to plain HTTP and cookie theft on the network. |
| `X-Content-Type-Options: nosniff` | Browsers "guessing" a file is a script when it is not. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Full page addresses (which can contain search terms) leaking to other sites. |
| `Permissions-Policy` | Any injected code switching on camera, microphone, location, USB and friends. All are denied. |
| `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy` | Cross-origin window access and other sites embedding rCloud's resources. |
| `Cache-Control: no-store` on `/admin/*` and `/api/constituency/*` | Signed-in pages and generated reports being cached on shared computers. Next.js also marks dynamic pages non-cacheable by itself; the explicit rule covers the CDN-served copies. |
| `X-Robots-Tag: noindex, nofollow` on `/admin/*`, and on every deploy preview | The admin area and throwaway copies of the site ending up in search results. |

**Where the rules live.** Netlify's `[[headers]]` rules only cover files Netlify
serves from its own store; responses produced by the Next.js runtime (HTML
pages, `/api/*`, server actions) need the headers declared in the app itself.
So the same values exist in three places:

1. `rcloud/rcloud/src/lib/security/policy.ts` — the source of truth
2. `rcloud/rcloud/next.config.ts` — imports it; covers the runtime responses
3. `rcloud/rcloud/netlify.toml`, `netlify.toml` (repository root) and
   `rcloud/rcloud/public/_headers` — the plain-text copies for everything the
   CDN serves, and for other static hosts (Cloudflare Pages reads `_headers`)

`npm run check:headers` fails if one of the copies drifts, so a future "small
CSP tweak" cannot end up half-applied.

**Verify after a deploy:**

```bash
curl -sI https://<your-site>/ | grep -iE 'content-security|x-frame|strict-transport|referrer|permissions|cross-origin'
curl -sI https://<your-site>/admin/login | grep -iE 'cache-control|x-robots-tag'
```

Then check the public graders — [securityheaders.com](https://securityheaders.com)
and [Mozilla Observatory](https://developer.mozilla.org/en-US/observatory) —
which should report an A for the public site.

### 2.2 Copycat / impersonation protection

Nobody can stop a determined person from copying the HTML of a public website.
What these measures do is remove the ways a copy is *useful*:

- **No embedding** — `frame-ancestors 'none'` + `X-Frame-Options` (section 2.1),
  so a fake page cannot wrap the real rCloud and collect what students type
  into it.
- **Canonical address** — every page declares its own canonical URL
  (`metadataBase` + `alternates.canonical`, set from `NEXT_PUBLIC_SITE_URL`),
  `robots.txt` lists the sitemap, and the public pages publish schema.org
  `Organization` structured data naming the council and its address. A clone
  cannot claim rCloud's canonical URL, so search engines keep ranking the
  original.
- **A visible address to check** — the footer states the official host once
  `NEXT_PUBLIC_SITE_URL` is set ("Official site: … · rCloud is not published
  anywhere else — report a copy"), so a student who lands on a look-alike can
  see immediately that it is not us.
- **Throwaway copies stay out of search** — deploy previews and branch builds
  send `X-Robots-Tag: noindex, nofollow` (via `CONTEXT` in `next.config.ts`), so
  a scraping clone cannot harvest a preview URL instead.
- **The admin area is invisible** — not linked from any public page,
  disallowed in `robots.txt`, absent from `sitemap.xml`, and noindexed.

### 2.3 Accounts and the admin area

- **Passwords** are hashed with **scrypt** (per-password random salt, 64-byte
  digest) and compared in constant time (`src/lib/server/passwords.ts`).
- **Sessions** are 24 random bytes; only the SHA-256 hash is stored in
  Postgres, so a stolen database dump cannot be replayed as a sign-in. The
  cookie is `HttpOnly`, `Secure`, `SameSite=Lax` (production) with a 7-day
  expiry, and expired rows are pruned on the next sign-in.
- **Password changes rotate sessions.** Changing the password in
  Admin → Account deletes every session for that account and issues a fresh one
  to the current device, so a leaked password cannot keep a stranger signed in.
- **Rate limiting on sign-in** — 6 wrong passwords for one account, or 20 from
  one network address, inside 15 minutes blocks that key for 15 minutes. The
  sign-in form shows one generic message either way.
- **No user enumeration** — an unknown email still runs a full scrypt
  verification against a decoy hash, so response times do not reveal which
  addresses have accounts.
- **Application-level permissions** — every server action calls
  `requirePermission(...)` before touching data; the role checks are not just
  hidden buttons (`src/lib/server/permissions.ts`, `src/lib/server/actions.ts`).
- **CSRF** — the admin uses Next.js server actions, which the framework rejects
  unless the request's `Origin` matches the site.
- **No public sign-up** — accounts can only be created by seeding or by the
  Head Admin changing credentials.
- **Debug output removed** — sign-in used to append token prefixes to a log
  file; that only happens now with `RCLOUD_AUTH_DEBUG=1`, and never prints
  tokens, hashes or email addresses.

### 2.4 Data handling

- The constituency report reads only the *aggregate* row of the chosen period
  (safe / BAHA / internet totals). Individual responses, names and sections are
  never read from the sheet, and the report endpoint is rate limited (15 per
  10 minutes per address, `Retry-After` on refusal) with a 4 KB body cap,
  because PDF rendering is the most expensive request the site serves.
- Uploaded images are restricted to PNG/JPG/WebP under 400 KB.
- Secrets live in environment variables, never in the repository. `.env` stays
  untracked; `.env.example` contains placeholders only.

---

## 3. What is *not* protected yet (honest list)

1. **`unsafe-inline` in the CSP.** Next.js streams hydration data and Tailwind
   styles as inline elements, so inline script/style is currently allowed. A
   nonce per request (Next.js middleware) is the fix; it is the single biggest
   remaining hardening step.
2. **Rate limiting is per instance.** Netlify may run several function
   instances, each with its own counters, so the real budget for an attacker is
   a few times the numbers above. It makes guessing impractical, but it is not
   a guarantee.
3. **No second factor on the admin sign-in.** Two shared accounts, passwords
   only. Anyone who learns the password is in.
4. **The seeded passwords (`rcloud2026`)** must be changed before the site is
   public — see the checklist below.
5. **No alerting.** Nobody is emailed when someone signs in to `/admin` or when
   repeated sign-ins fail.
6. **No dependency monitoring.** No Dependabot and no CI running `npm audit` /
   `npm run check:headers` on each push. Run `npm audit --omit=dev` by hand
   after any dependency change (status September 2026: **0** production
   vulnerabilities; the 4 moderate advisories are in dev-only tooling —
   `drizzle-kit`/`esbuild` — and never ship to the site).
7. **No backups documented.** Losing the database loses every page's content.

---

## 4. Recommended next steps, in order of value

| # | Action | Why | Effort |
| --- | --- | --- | --- |
| 1 | Set `NEXT_PUBLIC_SITE_URL` in Netlify and change both seed passwords **before** the site is announced | The canonical address powers the anti-copycat work; default passwords are public knowledge | 10 min |
| 2 | Turn on 2FA for the Netlify account and the database provider, and use a dedicated database role for the site | Whoever holds those two accounts can replace the site or read the data | 20 min |
| 3 | Verify the headers after the first production deploy (`curl`, securityheaders.com) | Confirms the armour actually reached production | 10 min |
| 4 | Add a GitHub Action running `npm run check:headers` + `npm run lint` + `npm audit` | Catches drift and known-vulnerable dependencies automatically | 1 h |
| 5 | Add a nonce-based CSP (removes `unsafe-inline`) | Turns the CSP from "strong" into "strict" | half a day |
| 6 | Put Netlify rate limiting (or Cloudflare in front) on `/admin/login` and `/api/*` | Makes the per-instance limit a real global limit, plus basic DDoS cover | 1–2 h |
| 7 | Email/Telegram alert on each successful admin sign-in | Turns a silent compromise into a visible one | 2 h |
| 8 | Schedule database backups (Neon branches or a weekly dump) | Recovery after deletion or corruption | 1 h |
| 9 | Review admin accounts each term; rotate passwords when officers change | Two shared accounts age badly | per term |

### If rCloud is cloned

1. Take screenshots and note the clone's URL, hosting provider and, if visible,
   its registrar.
2. Report it: the host's abuse address, the registrar's abuse address, and
   [Google Safe Browsing](https://safebrowsing.google.com/safebrowsing/report_phish/)
   for phishing — plus a Facebook report if it is being spread there.
3. Warn students through the official council page: state the official address
   and that the council never asks for passwords through rCloud.
4. If anyone may have typed their credentials into the clone, change both admin
   passwords in Admin → Account. That also deletes every existing session for
   the account, so anyone holding the old password is signed out immediately.
5. Keep the evidence; do not engage with the operators directly.

---

## 5. Files that matter

| Path | Purpose |
| --- | --- |
| `rcloud/rcloud/src/lib/security/policy.ts` | Source of truth for every security header |
| `rcloud/rcloud/src/lib/security/rateLimit.ts` | In-memory rate limiter used by sign-in and the report API |
| `rcloud/rcloud/src/lib/security/siteUrl.ts` | Canonical site address (canonical tags, footer notice, robots) |
| `rcloud/rcloud/next.config.ts` | Applies the headers to runtime responses |
| `rcloud/rcloud/netlify.toml`, `netlify.toml` | Edge rules for CDN-served files |
| `rcloud/rcloud/public/_headers` | Plain-text copy for static hosts |
| `rcloud/rcloud/src/app/robots.ts`, `src/app/sitemap.ts` | What search engines may index |
| `rcloud/rcloud/src/app/.well-known/security.txt/route.ts` | Contact for vulnerability reports |
| `rcloud/rcloud/src/lib/server/auth.ts`, `passwords.ts` | Sessions and password hashing |
| `rcloud/rcloud/scripts/check-security-headers.ts` | Fails the check when header copies drift |

---

*Last reviewed: September 2026.*
