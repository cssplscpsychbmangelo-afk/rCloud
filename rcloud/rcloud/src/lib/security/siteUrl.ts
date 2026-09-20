/**
 * The canonical public address of rCloud.
 *
 * Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://rcloud.netlify.app`) in Netlify →
 * Site configuration → Environment variables. Everything that needs to name the
 * official site reads it from here: `robots.txt`, `sitemap.xml`, the canonical
 * `<link>` tag, the structured data block and the footer notice.
 *
 * Why it matters for copycats: a clone can copy the HTML, but it cannot make
 * search engines believe it is the original if the original consistently
 * declares its own canonical address in every page.
 */

function normalize(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // `origin` never carries a trailing slash.
    return url.origin;
  } catch {
    return null;
  }
}

/** Origin only, e.g. `https://rcloud.netlify.app` — `null` when unset. */
export const SITE_URL: string | null = normalize(process.env.NEXT_PUBLIC_SITE_URL);

/** Host only, e.g. `rcloud.netlify.app` — `null` when unset. */
export const SITE_HOST: string | null = SITE_URL ? new URL(SITE_URL).host : null;

/**
 * True while the configured address still points at a development machine.
 * Used to avoid printing "Official site: localhost:3000" on a preview.
 */
export const SITE_URL_IS_LOCAL = SITE_HOST
  ? /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(SITE_HOST)
  : true;
