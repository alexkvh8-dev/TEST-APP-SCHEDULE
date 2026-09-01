"use client";

import { formatMoney } from "@/lib/currency";
import type { StreakInfo } from "@/lib/types";

const INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/** The week runs today-6..today, so the initial comes from the date itself. */
function initialFor(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return INITIALS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * The streak counts days *logged*, not days under budget.
 *
 * Rewarding a low-spend day would make the honest thing — writing down the
 * expensive day — cost you something. Today stays open until it ends, so an
 * unlogged morning never breaks a run that is still live.
 */
export function StreakCard({ streak, currency }: { streak: StreakInfo; currency: string }) {
  const week = streak.week;

  return (
    <section className="card flex items-center gap-4 p-4">
      <div
        className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl"
        style={{
          background: streak.current > 0 ? "var(--lime)" : "var(--field)",
          color: streak.current > 0 ? "var(--lime-ink)" : "var(--muted)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2s1.2 3 3.2 4.8C17.6 9 19 11 19 13.5A7 7 0 1 1 5 13.5c0-1.6.6-3 1.6-4.2.2 1.3 1 2.2 2 2.2 1.4 0 2-1.2 1.8-2.8C10.1 6 11 3.6 12 2Z" />
        </svg>
        <span className="num mt-0.5 text-base">{streak.current}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {streak.current === 0
            ? "No streak yet"
            : `${streak.current} day${streak.current === 1 ? "" : "s"} in a row`}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--ink-2)" }}>
          {streak.loggedToday
            ? `Best run: ${streak.longest} days.`
            : "One entry today keeps it going."}
        </p>

        <ul className="mt-2.5 flex gap-1.5">
          {week.map((day, index) => {
            const isToday = index === week.length - 1;
            return (
              <li key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="flex h-6 w-full items-center justify-center rounded-md text-[10px] font-bold"
                  style={{
                    background: day.logged ? "var(--lime)" : "var(--field)",
                    color: day.logged ? "var(--lime-ink)" : "var(--muted)",
                    outline: isToday ? "2px solid var(--ink)" : "none",
                    outlineOffset: 1,
                  }}
                  title={
                    day.logged
                      ? `${day.date}: ${formatMoney(day.total, currency)}`
                      : `${day.date}: nothing logged`
                  }
                >
                  {initialFor(day.date)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
