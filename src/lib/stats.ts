import { eachDay, localDateString, type PeriodRange } from "./periods";
import type { Expense, PeriodStats } from "./types";

/**
 * Turn raw expense rows into everything the charts and the model need.
 * All amounts are `base_amount`, i.e. already normalised to the user's
 * base currency at the rate that applied when each expense was entered.
 */
export function buildStats(
  expenses: Expense[],
  range: PeriodRange,
  currency: string,
  timezone: string,
  previousTotal: number,
): PeriodStats {
  const round = (n: number) => Math.round(n * 100) / 100;

  let total = 0;
  let needs = 0;
  let wants = 0;
  let unclear = 0;

  const dayMap = new Map<string, { total: number; needs: number; wants: number; unclear: number }>();
  for (const date of eachDay(range.start, range.end)) {
    dayMap.set(date, { total: 0, needs: 0, wants: 0, unclear: 0 });
  }

  const categoryMap = new Map<string, { total: number; count: number }>();

  for (const e of expenses) {
    const amount = Number(e.base_amount) || 0;
    total += amount;
    if (e.need_level === "need") needs += amount;
    else if (e.need_level === "want") wants += amount;
    else unclear += amount;

    const day = localDateString(new Date(e.spent_at), timezone);
    const bucket = dayMap.get(day);
    if (bucket) {
      bucket.total += amount;
      if (e.need_level === "need") bucket.needs += amount;
      else if (e.need_level === "want") bucket.wants += amount;
      else bucket.unclear += amount;
    }

    const category = e.category || "Other";
    const cat = categoryMap.get(category) ?? { total: 0, count: 0 };
    cat.total += amount;
    cat.count += 1;
    categoryMap.set(category, cat);
  }

  return {
    period: range.period,
    start: range.start,
    end: range.end,
    currency,
    total: round(total),
    count: expenses.length,
    needs_total: round(needs),
    wants_total: round(wants),
    unclear_total: round(unclear),
    by_day: [...dayMap.entries()].map(([date, v]) => ({
      date,
      total: round(v.total),
      needs: round(v.needs),
      wants: round(v.wants),
      unclear: round(v.unclear),
    })),
    by_category: [...categoryMap.entries()]
      .map(([category, v]) => ({ category, total: round(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total),
    top_expenses: [...expenses]
      .sort((a, b) => Number(b.base_amount) - Number(a.base_amount))
      .slice(0, 25)
      .map((e) => ({
        item: e.item,
        amount: round(Number(e.base_amount)),
        need_level: e.need_level,
        spent_at: e.spent_at,
      })),
    previous_total: round(previousTotal),
  };
}
