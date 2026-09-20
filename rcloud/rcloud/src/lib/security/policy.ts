/**
 * rCloud security policy — the single source of truth for the HTTP security
 * headers the site sends.
 *
 * Why this file exists
 * --------------------
 * rCloud is deployed to Netlify with the Next.js runtime. Netlify's own rules
 * (`netlify.toml` → `[[headers]]`, and the `_headers` file) are applied by the
 * edge to the files Netlify serves itself. They do **not** reliably reach
 * responses produced by the Next.js runtime — HTML pages, route handlers and
 * server actions are answered by the runtime, so the rules have to be declared
 * in `next.config.ts` as well. Every layer therefore carries the same values:
 *
 *   1. `next.config.ts`      → authoritative for HTML pages, `/api/*`, actions
 *   2. `netlify.toml`        → the same values for everything Netlify's CDN serves
 *   3. `public/_headers`     → plain-text copy (also what other static hosts,
 *                              e.g. Cloudflare Pages, read)
 *
 * `scripts/check-security-headers.mjs` (`npm run check:headers`) fails loudly
 * when the three copies drift apart, so they cannot silently rot.
 *
 * The file is deliberately dependency-free (no `next/*` imports) so that it can
 * be used from `next.config.ts`, from app code and from that plain-node script.
 */

export type PolicyInput = {
  /**
   * `true` while the site is served by `next dev` (localhost and the Arena
   * live-preview iframe). Two rules are relaxed in development *only*:
   *   - framing, because the live preview renders the app inside an iframe
   *   - HSTS, because it is meaningless over http and would poison the browser
   *     for the whole preview host
   */
  dev?: boolean;
  /**
   * Netlify's `CONTEXT` build variable: `production`, `deploy-preview`,
   * `branch-deploy`. Deploy previews and branch builds are throwaway copies of
   * the site — they get `noindex, nofollow` so a clone of rCloud can never be
   * the copy that search engines list.
   */
  deployContext?: string;
};

/* -------------------------------------------------------------------------- */
/*  Content-Security-Policy                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Content-Security-Policy.
 *
 * This is the header that does most of the "armour" work:
 *   - `frame-ancestors 'none'` → no other site may embed rCloud in an iframe,
 *     which is what stops the classic clone-and-collect-credentials scam.
 *   - `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'` and
 *     `form-action 'self'` → plugin/flash embeds, injected iframes, `<base>`
 *     hijacking and forms that POST a student's input to a third-party domain
 *     are all refused by the browser.
 *   - `connect-src 'self'` → injected code cannot quietly ship page data to an
 *     attacker-controlled endpoint.
 *
 * Two honest notes about the current policy:
 *   - `script-src`/`style-src` still allow `'unsafe-inline'`. Next.js streams
 *     hydration data and Tailwind styles as inline elements, so removing this
 *     requires a per-request nonce (see "Recommended next steps" in
 *     SECURITY.md). Everything else is locked down today, and inline
 *     *third-party* scripts are already impossible.
 *   - `img-src` allows `https:` because officers/projects may point at external
 *     photo links that admins pasted in; images are not script-executing.
 */
export function contentSecurityPolicy({ dev = false }: PolicyInput = {}): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    dev
      ? // Dev keeps the preview iframe working (it is cross-site), so no
        // frame-ancestors restriction is sent while running `next dev`.
        null
      : "frame-ancestors 'none'",
    dev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    dev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "frame-src 'none'",
    "child-src 'none'",
    "media-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    dev ? null : "upgrade-insecure-requests",
  ].filter((directive): directive is string => directive !== null);

  return directives.join("; ");
}

/* -------------------------------------------------------------------------- */
/*  Individual headers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * HSTS — force HTTPS for two years, subdomains included.
 *
 * `preload` is intentionally left out: submitting a domain to the browser
 * preload list is effectively permanent, so it should only be done once the
 * council is certain the site and all of its subdomains will always be HTTPS.
 */
export const STRICT_TRANSPORT_SECURITY = "max-age=63072000; includeSubDomains";

/**
 * Powerful browser APIs rCloud never uses. Denying them means an injected
 * script cannot turn on a visitor's camera, microphone or location even if it
 * somehow gets executed. `fullscreen` stays available to the site itself so the
 * Roomivility schedule can still be viewed full-screen on a phone.
 */
export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=()",
  "publickey-credentials-get=(self)",
  "screen-wake-lock=()",
  "usb=()",
  "xr-spatial-tracking=()",
].join(", ");

/**
 * `noindex, nofollow` for everything that is not the live council site:
 * deploy previews, branch builds and (belt-and-braces) the admin area.
 */
export function robotsTag({ deployContext }: PolicyInput = {}): string | null {
  const context = deployContext?.trim().toLowerCase();
  if (!context || context === "production") return null;
  return "noindex, nofollow";
}

/* -------------------------------------------------------------------------- */
/*  Header sets                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Headers sent with **every** response of the public site.
 *
 * Excluded on purpose: `Cache-Control` (per-path, see below) and
 * `X-Robots-Tag` for the production site (the public pages are meant to be
 * found by students, so no blanket noindex is sent there).
 */
export function securityHeaders(input: PolicyInput = {}): Record<string, string> {
  const { dev = false } = input;

  const headers: Record<string, string> = {
    "Content-Security-Policy": contentSecurityPolicy(input),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-DNS-Prefetch-Control": "off",
    "Permissions-Policy": PERMISSIONS_POLICY,
  };

  if (!dev) {
    headers["Strict-Transport-Security"] = STRICT_TRANSPORT_SECURITY;
    // Legacy belt-and-braces for old browsers that ignore frame-ancestors.
    headers["X-Frame-Options"] = "DENY";
    // Anti-hotlinking: other sites may not pull rCloud's files as subresources.
    // Left out in development together with the framing rules below, so the
    // live-preview iframe can never be blocked by the armour meant to protect
    // the deployed site.
    headers["Cross-Origin-Resource-Policy"] = "same-site";
  }

  const robots = robotsTag(input);
  if (robots) headers["X-Robots-Tag"] = robots;

  return headers;
}

/** Signed-in pages and anything that renders a session — never cached. */
export function adminHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0, must-revalidate",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

/**
 * API answers that are generated per request (the constituency PDF report).
 * Kept separate from `/api/roomfinder/*`, which is deliberately cached for the
 * free tier.
 */
export function privateApiHeaders(): Record<string, string> {
  return { "Cache-Control": "no-store, max-age=0, must-revalidate" };
}

/** Serialised `<key>: <value>` block, handy for logs and for documentation. */
export function describeHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}
