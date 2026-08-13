import type { SupabaseClient } from "@supabase/supabase-js";

import { generateInsight } from "./anthropic";
import { periodLabel, periodRange, previousRange, utcWindow, type PeriodRange } from "./periods";
import { buildStats } from "./stats";
import type { Expense, InsightPayload, Period, PeriodStats, Profile } from "./types";

export interface Report {
  range: PeriodRange;
  label: string;
  stats: PeriodStats;
  insight: InsightPayload;
  expenses: Expense[];
}

async function expensesIn(
  supabase: SupabaseClient,
  userId: string,
  range: PeriodRange,
): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .gte("spent_at", range.startUtc.toISOString())
    .lt("spent_at", range.endUtc.toISOString())
    .order("spent_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Expense[];
}

/**
 * The last few comparable periods, so the model can say "up from last week"
 * rather than judging a number in isolation.
 */
async function trailingTotals(
  supabase: SupabaseClient,
  userId: string,
  range: PeriodRange,
  timezone: string,
  count: number,
): Promise<{ label: string; total: number }[]> {
  const out: { label: string; total: number }[] = [];
  let cursor = range;

  for (let i = 0; i < count; i++) {
    cursor = previousRange(cursor, timezone);
    const rows = await expensesIn(supabase, userId, cursor);
    const total = rows.reduce((sum, e) => sum + (Number(e.base_amount) || 0), 0);
    out.push({ label: periodLabel(cursor), total: Math.round(total * 100) / 100 });
  }

  return out.reverse();
}

/**
 * Build a full report, reusing the cached AI summary unless an expense in the
 * period has changed since it was written.
 */
export async function buildReport(
  supabase: SupabaseClient,
  profile: Profile,
  period: Period,
  options: { ref?: Date; force?: boolean } = {},
): Promise<Report> {
  const range = periodRange(period, profile.timezone, options.ref ?? new Date());
  const expenses = await expensesIn(supabase, profile.id, range);

  const prev = previousRange(range, profile.timezone);
  const prevRows = await expensesIn(supabase, profile.id, prev);
  const previousTotal = prevRows.reduce((sum, e) => sum + (Number(e.base_amount) || 0), 0);

  const stats = buildStats(expenses, range, profile.base_currency, profile.timezone, previousTotal);

  const { data: cached } = await supabase
    .from("insights")
    .select("payload, created_at")
    .eq("user_id", profile.id)
    .eq("period", period)
    .eq("period_start", range.start)
    .maybeSingle();

  const lastChange = expenses.reduce<string>(
    (latest, e) => (e.updated_at > latest ? e.updated_at : latest),
    "",
  );
  const isFresh = cached && (!lastChange || cached.created_at >= lastChange);

  if (isFresh && !options.force) {
    return {
      range,
      label: periodLabel(range),
      stats,
      insight: cached.payload as InsightPayload,
      expenses,
    };
  }

  const history =
    period === "daily" ? [] : await trailingTotals(supabase, profile.id, range, profile.timezone, 3);

  const insight = await generateInsight(stats, range, history);

  await supabase.from("insights").upsert(
    {
      user_id: profile.id,
      period,
      period_start: range.start,
      period_end: range.end,
      payload: insight,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,period,period_start" },
  );

  return { range, label: periodLabel(range), stats, insight, expenses };
}

/** Totals for the most recent `count` periods — the trend chart on reports. */
export async function trendSeries(
  supabase: SupabaseClient,
  profile: Profile,
  period: Period,
  count: number,
): Promise<{ label: string; start: string; total: number }[]> {
  const current = periodRange(period, profile.timezone);
  const ranges: PeriodRange[] = [current];
  for (let i = 1; i < count; i++) {
    ranges.push(previousRange(ranges[ranges.length - 1], profile.timezone));
  }

  const oldest = ranges[ranges.length - 1];
  const window = utcWindow(oldest.start, current.end, profile.timezone);

  const { data } = await supabase
    .from("expenses")
    .select("base_amount, spent_at")
    .eq("user_id", profile.id)
    .gte("spent_at", window.startUtc.toISOString())
    .lt("spent_at", window.endUtc.toISOString());

  const rows = data ?? [];

  return ranges
    .slice()
    .reverse()
    .map((r) => {
      const total = rows
        .filter((row) => {
          const t = new Date(row.spent_at).getTime();
          return t >= r.startUtc.getTime() && t < r.endUtc.getTime();
        })
        .reduce((sum, row) => sum + (Number(row.base_amount) || 0), 0);
      return {
        label: periodLabel(r),
        start: r.start,
        total: Math.round(total * 100) / 100,
      };
    });
}
