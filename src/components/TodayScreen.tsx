"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AddExpenseSheet } from "@/components/AddExpenseSheet";
import { ChartFrame, Legend, SplitBar, StackedDayBars, StatTile } from "@/components/charts";
import { ExpenseList } from "@/components/ExpenseList";
import { formatMoney } from "@/lib/currency";
import type { DayDatum } from "@/components/charts";
import type { Expense } from "@/lib/types";

export function TodayScreen({
  initialExpenses,
  week,
  currency,
  greeting,
  todayLabel,
}: {
  initialExpenses: Expense[];
  week: DayDatum[];
  currency: string;
  greeting: string;
  todayLabel: string;
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  // The inactivity notification deep-links to /?add=1 so the sheet is already
  // open by the time the app finishes loading.
  useEffect(() => {
    if (searchParams.get("add") === "1") setOpen(true);
  }, [searchParams]);

  const totals = useMemo(() => {
    let total = 0;
    let needs = 0;
    let wants = 0;
    let unclear = 0;
    for (const e of expenses) {
      const amount = Number(e.base_amount) || 0;
      total += amount;
      if (e.need_level === "need") needs += amount;
      else if (e.need_level === "want") wants += amount;
      else unclear += amount;
    }
    return { total, needs, wants, unclear };
  }, [expenses]);

  const handleAdded = useCallback((expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);
    // The classifier runs just after the response, so pick up its labels.
    setTimeout(() => {
      fetch("/api/expenses?period=daily")
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => body?.expenses && setExpenses(body.expenses))
        .catch(() => {});
    }, 2500);
  }, []);

  const handleRemoved = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Today's bar reflects local edits without a round trip.
  const weekWithToday = useMemo(() => {
    if (!week.length) return week;
    const copy = [...week];
    copy[copy.length - 1] = {
      ...copy[copy.length - 1],
      needs: totals.needs,
      wants: totals.wants,
      unclear: totals.unclear,
    };
    return copy;
  }, [week, totals]);

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {greeting} · {todayLabel}
        </p>
      </header>

      <StatTile label="Spent today" value={formatMoney(totals.total, currency)} hero />

      {totals.total > 0 && (
        <ChartFrame title="Needs vs wants" subtitle="Today">
          <SplitBar
            needs={totals.needs}
            wants={totals.wants}
            unclear={totals.unclear}
            currency={currency}
          />
        </ChartFrame>
      )}

      <ChartFrame
        title="Last 7 days"
        legend={
          <Legend
            items={[
              { label: "Needs", color: "var(--series-needs)" },
              { label: "Wants", color: "var(--series-wants)" },
            ]}
          />
        }
      >
        <StackedDayBars data={weekWithToday} currency={currency} />
      </ChartFrame>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Today&rsquo;s spends</h2>
        <ExpenseList
          expenses={expenses}
          currency={currency}
          onRemoved={handleRemoved}
          emptyMessage="Nothing logged yet. Tap + the moment you spend."
        />
      </section>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add a spend"
        className="fixed right-5 z-30 flex size-14 items-center justify-center rounded-full text-3xl leading-none text-white transition-transform active:scale-95"
        style={{
          bottom: "calc(76px + env(safe-area-inset-bottom))",
          background: "var(--series-needs)",
          boxShadow: "0 6px 20px rgba(42,120,214,0.4)",
        }}
      >
        <span aria-hidden style={{ marginTop: -3 }}>
          +
        </span>
      </button>

      <AddExpenseSheet
        open={open}
        onClose={() => setOpen(false)}
        onAdded={handleAdded}
        defaultCurrency={currency}
      />
    </div>
  );
}
