/**
 * Timezone-aware period maths.
 *
 * Every user has their own IANA timezone, and cron runs in UTC, so "today"
 * and "this week" have to be computed in the user's local calendar and then
 * translated back to UTC instants for the database query.
 *
 * Implemented with Intl only — no date library, no extra bundle weight.
 */

import type { Period } from "./types";

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  /** 0 = Sunday. */
  weekday: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Break a UTC instant into calendar parts as seen in `timezone`. */
export function localParts(date: Date, timezone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Intl renders midnight as "24" in some locales/engines.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: Math.max(0, WEEKDAYS.indexOf(parts.weekday)),
  };
}

/** How far `timezone` is ahead of UTC at this instant, in ms. */
function offsetMs(date: Date, timezone: string): number {
  const p = localParts(date, timezone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, date.getUTCSeconds());
  // Second-level precision is enough; zones never differ by sub-minute amounts.
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The UTC instant for a wall-clock time in `timezone`. Iterates twice so the
 * result stays correct across DST boundaries, where the offset at the guessed
 * instant differs from the offset at the real one.
 */
export function utcFromLocal(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  let ts = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    ts = Date.UTC(year, month - 1, day, hour, minute) - offsetMs(new Date(ts), timezone);
  }
  return new Date(ts);
}

/** "2026-08-13" in the user's timezone. */
export function localDateString(date: Date, timezone: string): string {
  const p = localParts(date, timezone);
  return isoDate(p.year, p.month, p.day);
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function daysBetween(startStr: string, endStr: string): number {
  const [y1, m1, d1] = startStr.split("-").map(Number);
  const [y2, m2, d2] = endStr.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Every date from start to end inclusive, for gap-filling chart series. */
export function eachDay(startStr: string, endStr: string): string[] {
  const out: string[] = [];
  for (let d = startStr; daysBetween(d, endStr) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

export interface PeriodRange {
  period: Period;
  /** Inclusive local calendar dates. */
  start: string;
  end: string;
  /** Half-open UTC window: startUtc <= spent_at < endUtc. */
  startUtc: Date;
  endUtc: Date;
}

/**
 * The period containing `ref`.
 *
 * - daily   — that local day
 * - weekly  — Sunday..Saturday. Weeks end on Saturday so the Sunday-morning
 *             report always covers a week that has actually finished.
 * - monthly — 1st..last day of the local month
 */
export function periodRange(period: Period, timezone: string, ref: Date = new Date()): PeriodRange {
  const p = localParts(ref, timezone);
  let start: string;
  let end: string;

  if (period === "daily") {
    start = isoDate(p.year, p.month, p.day);
    end = start;
  } else if (period === "weekly") {
    start = addDays(isoDate(p.year, p.month, p.day), -p.weekday);
    end = addDays(start, 6);
  } else {
    start = isoDate(p.year, p.month, 1);
    const lastDay = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
    end = isoDate(p.year, p.month, lastDay);
  }

  return { period, start, end, ...utcWindow(start, end, timezone) };
}

/** The period immediately before this one, same length. Used for the delta. */
export function previousRange(range: PeriodRange, timezone: string): PeriodRange {
  if (range.period === "monthly") {
    const [y, m] = range.start.split("-").map(Number);
    const prevRef = utcFromLocal(timezone, y, m, 1, 12);
    prevRef.setUTCDate(prevRef.getUTCDate() - 15);
    return periodRange("monthly", timezone, prevRef);
  }
  const span = daysBetween(range.start, range.end) + 1;
  const start = addDays(range.start, -span);
  const end = addDays(range.end, -span);
  return { period: range.period, start, end, ...utcWindow(start, end, timezone) };
}

/** Local calendar dates -> the half-open UTC instant window covering them. */
export function utcWindow(start: string, end: string, timezone: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const nextDay = addDays(end, 1);
  const [ey, em, ed] = nextDay.split("-").map(Number);
  return {
    startUtc: utcFromLocal(timezone, sy, sm, sd, 0, 0),
    endUtc: utcFromLocal(timezone, ey, em, ed, 0, 0),
  };
}

/** "13 Aug", "Mon", "Aug" — axis labels sized for a phone. */
export function shortLabel(dateStr: string, period: Period): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (period === "weekly") {
    return dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  }
  return dt.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function periodLabel(range: PeriodRange): string {
  const [y, m, d] = range.start.split("-").map(Number);
  const startDt = new Date(Date.UTC(y, m - 1, d));
  if (range.period === "daily") {
    return startDt.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  }
  if (range.period === "monthly") {
    return startDt.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  const [ey, em, ed] = range.end.split("-").map(Number);
  const endDt = new Date(Date.UTC(ey, em - 1, ed));
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(startDt)} – ${fmt(endDt)}`;
}
