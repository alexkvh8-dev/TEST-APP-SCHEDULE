"use client";

import Link from "next/link";

import { formatMoney } from "@/lib/currency";
import type { SafeToSpend } from "@/lib/types";

/**
 * The one number that answers "can I buy this?".
 *
 * It is deliberately not "how much have I spent" — that is history, and
 * history has never stopped anybody at a till. Without a budget there is no
 * honest number to show, so it asks for one instead of inventing it.
 */
export function SafeToSpendCard({
  safe,
  spentToday,
  currency,
  over,
}: {
  safe: SafeToSpend;
  spentToday: number;
  currency: string;
  over: boolean;
}) {
  if (safe.amount == null) {
    return (
      <section className="card p-5">
        <p className="label">Spent today</p>
        <p className="num mt-2 text-4xl">{formatMoney(spentToday, currency)}</p>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-2)" }}>
          Set a monthly budget and this becomes a safe-to-spend figure for today
          instead of a running total.
        </p>
        <Link
          href="/budget"
          className="btn-lime mt-3 inline-block px-5 py-2.5 text-sm"
        >
          Set a budget
        </Link>
      </section>
    );
  }

  const left = Math.max(0, safe.amount - spentToday);
  const used = safe.amount > 0 ? Math.min(1, spentToday / safe.amount) : 1;

  return (
    <section
      className="p-5"
      style={{
        background: "var(--ink)",
        color: "var(--card)",
        borderRadius: 22,
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="label" style={{ color: "rgba(255,255,255,0.55)" }}>
          {over ? "Over today's pace" : "Safe to spend today"}
        </p>
        <span className="tabular text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
          {safe.daysLeft} {safe.daysLeft === 1 ? "day" : "days"} left
        </span>
      </div>

      <p className="num mt-2 text-5xl" style={{ color: over ? "var(--wants)" : "var(--lime)" }}>
        {formatMoney(over ? spentToday - safe.amount : left, currency)}
      </p>

      {/* How much of today's allowance is gone, before the number changes. */}
      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.14)" }}
        role="img"
        aria-label={`${Math.round(used * 100)} percent of today's allowance used`}
      >
        <div
          className="h-2 rounded-full"
          style={{
            width: `${Math.max(used * 100, 2)}%`,
            background: over ? "var(--wants)" : "var(--lime)",
          }}
        />
      </div>

      <p className="mt-3 text-sm leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>
        {over
          ? `${formatMoney(spentToday, currency)} spent against a ${formatMoney(safe.amount, currency)} pace. Tomorrow's number drops to keep the month whole.`
          : `${formatMoney(spentToday, currency)} spent today · ${formatMoney(safe.remainingThisMonth, currency)} left this month.`}
      </p>
    </section>
  );
}
