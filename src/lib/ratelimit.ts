/**
 * A per-user rate limit for the endpoints that cost money or CPU.
 *
 * The threat here is not someone else's data — RLS already handles that. It is
 * a signed-in account, yours or a stolen one, burning the free Gemini quota or
 * pushing 6 MB images at the receipt reader in a loop until the app stops
 * working for everyone. Vision calls are the expensive ones, so they get the
 * tightest budget.
 *
 * In-memory and per-instance, which on serverless means the real ceiling is
 * this multiplied by the number of warm instances. That is fine: this exists
 * to stop runaway loops and casual abuse, and it costs nothing to run. If the
 * app ever needs a hard global cap, it wants Postgres or Redis behind it —
 * that is a different tool, not a tweak to this one.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bounded so a flood of distinct user ids cannot grow the map without limit.
const MAX_TRACKED = 5_000;

export interface RateLimit {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const LIMITS = {
  /** Vision calls: the slowest and most expensive thing the app does. */
  receipt: { limit: 12, windowMs: 60 * 60 * 1000 },
  /** Text parsing: cheap, but still a model call per tap. */
  voice: { limit: 60, windowMs: 60 * 60 * 1000 },
  /** The coach streams a full conversation each time. */
  chat: { limit: 40, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimit>;

export interface RateVerdict {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets, for the Retry-After header. */
  retryAfter: number;
}

export function rateLimit(key: string, scope: string, { limit, windowMs }: RateLimit): RateVerdict {
  const now = Date.now();
  const id = `${scope}:${key}`;
  const existing = buckets.get(id);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED) sweep(now);
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) return { ok: false, remaining: 0, retryAfter };
  return { ok: true, remaining: limit - existing.count, retryAfter };
}

/** Drop expired buckets; if that frees nothing, drop everything and start over. */
function sweep(now: number) {
  for (const [id, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(id);
  }
  if (buckets.size >= MAX_TRACKED) buckets.clear();
}
