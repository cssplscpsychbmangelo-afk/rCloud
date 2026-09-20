/**
 * Small in-memory rate limiter.
 *
 * Used for the two places where a few abusive requests would actually cost the
 * council something:
 *   - `/admin/login`  → password guessing against the two admin accounts
 *   - `/api/constituency/report` → PDF rendering, the most expensive endpoint
 *
 * Why in-memory instead of a database table: it needs no schema change, no
 * extra dependency and it cannot fail closed when the database is unreachable.
 * The honest limitation is that every serverless instance keeps its own
 * counters, so an attacker spread over many cold starts gets a slightly larger
 * budget than the numbers below suggest. The layers that fix that for good
 * (Netlify rate limiting / a CAPTCHA in front of the endpoints) are written up
 * in SECURITY.md — this module is the layer that never depends on a service.
 */

type Options = {
  /** Number of strikes allowed inside `windowMs` before the key is blocked. */
  limit: number;
  /** Rolling window for counting strikes. */
  windowMs: number;
  /** How long a key stays blocked once it trips the limit. */
  blockMs: number;
};

type Bucket = {
  /** Timestamps of the recent strikes inside the current window. */
  strikes: number[];
  /** Set while the key is blocked. */
  blockedUntil: number;
};

const buckets = new Map<string, Bucket>();

/** Keep the map from growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 500;

function pruneExpired(now: number, opts: Options): void {
  for (const [key, bucket] of buckets) {
    const last = bucket.strikes[bucket.strikes.length - 1] ?? 0;
    const stillCounting = now - last < opts.windowMs;
    const stillBlocked = bucket.blockedUntil > now;
    if (!stillCounting && !stillBlocked) buckets.delete(key);
  }
}

function bucketFor(key: string, now: number, opts: Options): Bucket {
  if (buckets.size > MAX_TRACKED_KEYS) pruneExpired(now, opts);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { strikes: [], blockedUntil: 0 };
    buckets.set(key, bucket);
  }
  // Drop strikes that have fallen out of the window.
  bucket.strikes = bucket.strikes.filter((at) => now - at < opts.windowMs);
  return bucket;
}

export type RateLimitState = {
  blocked: boolean;
  /** Seconds the caller should wait — sent as `Retry-After` on API answers. */
  retryAfterSeconds: number;
  /** How many strikes are left before the key is blocked. */
  remaining: number;
};

/** Check a key without counting anything (used before verifying credentials). */
export function isBlocked(key: string, opts: Options): RateLimitState {
  const now = Date.now();
  const bucket = bucketFor(key, now, opts);
  const blocked = bucket.blockedUntil > now;
  return {
    blocked,
    retryAfterSeconds: blocked
      ? Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000))
      : 0,
    remaining: blocked ? 0 : Math.max(0, opts.limit - bucket.strikes.length),
  };
}

/** Count one strike against a key; blocks it for `blockMs` at the limit. */
export function recordFailure(key: string, opts: Options): RateLimitState {
  const now = Date.now();
  const bucket = bucketFor(key, now, opts);
  bucket.strikes.push(now);
  if (bucket.strikes.length >= opts.limit) {
    bucket.blockedUntil = now + opts.blockMs;
    bucket.strikes = [];
  }
  return isBlocked(key, opts);
}

/** Forget a key — called after a successful sign-in. */
export function clearFailures(key: string): void {
  buckets.delete(key);
}

/** Count every request (no success/failure distinction) — used by the API. */
export function take(key: string, opts: Options): RateLimitState {
  return recordFailure(key, opts);
}

/**
 * Best-effort client identity for rate limiting.
 *
 * On Netlify the trustworthy value is `x-nf-client-connection-ip` (set by the
 * edge, not the caller). `x-forwarded-for` is the fallback for other hosts and
 * for local development. A wrong or missing value only means a shared bucket,
 * never a security bypass — the counter is a speed bump, not an identity.
 */
export function clientIpFrom(headersLike: {
  get(name: string): string | null;
}): string {
  const edgeIp = headersLike.get("x-nf-client-connection-ip");
  if (edgeIp) return edgeIp.trim();

  const forwarded = headersLike.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return headersLike.get("x-real-ip")?.trim() || "unknown";
}
