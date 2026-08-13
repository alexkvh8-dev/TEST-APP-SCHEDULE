import type { NextRequest } from "next/server";

/**
 * Cron endpoints are public URLs, so they authenticate with a shared secret
 * instead of a session cookie. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Convenience for external schedulers that cannot set headers.
  return request.nextUrl.searchParams.get("secret") === secret;
}

/** True when the local hour falls inside [start, end], wrapping past midnight. */
export function withinHours(hour: number, start: number, end: number): boolean {
  if (start === end) return hour === start;
  if (start < end) return hour >= start && hour <= end;
  return hour >= start || hour <= end;
}
