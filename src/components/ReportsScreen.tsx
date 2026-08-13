"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ChartFrame,
  Legend,
  RankedBars,
  SplitBar,
  StackedDayBars,
  StatTile,
  TrendLine,
} from "@/components/charts";
import { formatMoney } from "@/lib/currency";
import { shortLabel } from "@/lib/periods";
import type { InsightPayload, Period, PeriodStats } from "@/lib/types";

interface ReportData {
  period: Period;
  label: string;
  currency: string;
  monthly_budget: number | null;
  stats: PeriodStats;
  insight: InsightPayload;
  trend: { label: string; start: string; total: number }[];
}

const TABS: { period: Period; label: string }[] = [
  { period: "daily", label: "Day" },
  { period: "weekly", label: "Week" },
  { period: "monthly", label: "Month" },
];

const TREND_TITLE: Record<Period, string> = {
  daily: "Last 14 days",
  weekly: "Last 8 weeks",
  monthly: "Last 6 months",
};

/** Monthly points get a month name; day and week points get a date. */
function trendLabel(start: string, period: Period): string {
  if (period !== "monthly") return shortLabel(start, "monthly");
  const [y, m] = start.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

export function ReportsScreen({ initialPeriod }: { initialPeriod: Period }) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next: Period, refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insights?period=${next}${refresh ? "&refresh=1" : ""}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load the report");
      setData(body as ReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const stats = data?.stats;
  const currency = data?.currency ?? "PKR";

  const deltaPct =
    stats && stats.previous_total > 0
      ? ((stats.total - stats.previous_total) / stats.previous_total) * 100
      : null;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {data?.label ?? "…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(period, true)}
          disabled={loading}
          className="rounded-lg px-2.5 py-1.5 text-xs disabled:opacity-50"
          style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
        >
          {loading ? "Working…" : "Refresh"}
        </button>
      </header>

      {/* Period switch — one row of controls above the charts */}
      <div
        role="tablist"
        aria-label="Report period"
        className="flex gap-1 rounded-xl p-1"
        style={{ background: "var(--surface-2)" }}
      >
        {TABS.map((tab) => {
          const active = tab.period === period;
          return (
            <button
              key={tab.period}
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(tab.period)}
              className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--surface-1)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
                boxShadow: active ? "var(--shadow)" : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{ border: "1px solid var(--critical)", color: "var(--critical)" }}
          role="alert"
        >
          {error}
        </p>
      )}

      {!stats && loading && (
        <div
          className="h-40 animate-pulse rounded-2xl"
          style={{ background: "var(--surface-2)" }}
          aria-label="Loading report"
        />
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <StatTile
                label="Total spent"
                value={formatMoney(stats.total, currency)}
                delta={deltaPct}
                hero
              />
            </div>
            <StatTile label="Purchases" value={String(stats.count)} />
            <StatTile
              label="Could have saved"
              value={formatMoney(data!.insight.could_have_saved, currency)}
            />
          </div>

          {/* The one piece of prose on the screen. */}
          <section
            className="rounded-2xl p-4"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
            }}
          >
            <h2 className="text-base font-semibold leading-snug">{data!.insight.headline}</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {data!.insight.verdict}
            </p>

            {data!.insight.tips.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {data!.insight.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm">
                    <span aria-hidden style={{ color: "var(--series-needs)" }}>
                      →
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ChartFrame title="Needs vs wants" subtitle={data!.label}>
            <SplitBar
              needs={stats.needs_total}
              wants={stats.wants_total}
              unclear={stats.unclear_total}
              currency={currency}
            />
          </ChartFrame>

          {period !== "daily" && (
            <ChartFrame
              title="Day by day"
              legend={
                <Legend
                  items={[
                    { label: "Needs", color: "var(--series-needs)" },
                    { label: "Wants", color: "var(--series-wants)" },
                  ]}
                />
              }
            >
              <StackedDayBars
                data={stats.by_day.map((d) => ({
                  date: d.date,
                  label: shortLabel(d.date, period),
                  needs: d.needs,
                  wants: d.wants,
                  unclear: d.unclear,
                }))}
                currency={currency}
              />
            </ChartFrame>
          )}

          <ChartFrame title="Where it went" subtitle="Top categories">
            <RankedBars data={stats.by_category} currency={currency} />
          </ChartFrame>

          <ChartFrame title={TREND_TITLE[period]} subtitle="Total per period">
            <TrendLine
              data={data!.trend.map((t) => ({
                label: trendLabel(t.start, period),
                total: t.total,
              }))}
              currency={currency}
            />
          </ChartFrame>

          {data!.insight.flagged.length > 0 && (
            <section
              className="rounded-2xl p-4"
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <h2 className="mb-2 text-sm font-semibold">Worth a second look</h2>
              <ul className="flex flex-col gap-2.5">
                {data!.insight.flagged.map((f) => (
                  <li key={f.item + f.amount} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{f.item}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {f.why}
                      </div>
                    </div>
                    <span className="tabular shrink-0 text-sm font-medium">
                      {formatMoney(f.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* The table view keeps the data readable without relying on colour. */}
          <details
            className="rounded-2xl p-4"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <summary className="cursor-pointer text-sm font-semibold">
              See the numbers as a table
            </summary>
            <div className="scroll-x mt-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: "var(--text-muted)" }}>
                    <th className="py-1 pr-3 font-medium">Day</th>
                    <th className="py-1 pr-3 text-right font-medium">Needs</th>
                    <th className="py-1 pr-3 text-right font-medium">Wants</th>
                    <th className="py-1 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {stats.by_day.map((d) => (
                    <tr key={d.date} style={{ borderTop: "1px solid var(--grid)" }}>
                      <td className="py-1.5 pr-3">{shortLabel(d.date, "monthly")}</td>
                      <td className="py-1.5 pr-3 text-right">{formatMoney(d.needs, currency)}</td>
                      <td className="py-1.5 pr-3 text-right">{formatMoney(d.wants, currency)}</td>
                      <td className="py-1.5 text-right font-medium">
                        {formatMoney(d.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
