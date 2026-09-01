import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Constant-time string comparison.
 *
 * `a === b` on secrets returns as soon as two bytes differ, so the time it
 * takes leaks how much of the guess was right. That is enough to recover a
 * secret one character at a time given enough requests, and these endpoints
 * are public URLs that anyone can hammer.
 */
function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length, so both sides are hashed to a fixed width first.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Cron endpoints are public URLs, so they authenticate with a shared secret
 * instead of a session cookie. The scheduler sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // A short secret is not a secret; refusing outright beats pretending.
  if (!secret || secret.length < 16) return false;

  const header = request.headers.get("authorization");
  if (header && secretsMatch(header, `Bearer ${secret}`)) return true;

  /*
   * Fallback for schedulers that cannot set headers. It is second-class on
   * purpose: query strings end up in server logs, browser history and the
   * Referer header, so the Authorization header is always the better route.
   */
  const fromQuery = request.nextUrl.searchParams.get("secret");
  return typeof fromQuery === "string" && secretsMatch(fromQuery, secret);
}

/** True when the local hour falls inside [start, end], wrapping past midnight. */
export function withinHours(hour: number, start: number, end: number): boolean {
  if (start === end) return hour === start;
  if (start < end) return hour >= start && hour <= end;
  return hour >= start || hour <= end;
}
