import type { SupabaseClient } from "@supabase/supabase-js";

import { formatMoney } from "./currency";
import {
  addDays,
  daysBetween,
  eachDay,
  localDateString,
  localParts,
  periodRange,
  utcWindow,
} from "./periods";
import type {
  CategoryBudget,
  DashboardData,
  Expense,
  Profile,
  RepeatItem,
  SafeToSpend,
  StreakInfo,
} from "./types";

/**
 * Consecutive days with at least one entry.
 *
 * Today not being logged yet does NOT break the streak — it is still live
 * until the day ends. Breaking it at midnight-plus-one-second would punish
 * someone for not having spent money yet.
 */
export function computeStreak(loggedDates: Set<string>, today: string): StreakInfo {
  let current = 0;
  let cursor = loggedDates.has(today) ? today : addDays(today, -1);
  while (loggedDates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest run anywhere in the history we were given.
  const sorted = [...loggedDates].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    run = previous && daysBetween(previous, date) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return {
    current,
    longest: Math.max(longest, current),
    loggedToday: loggedDates.has(today),
    week: [],
  };
}

/**
 * What is genuinely free to spend today: whatever is left of the monthly
 * budget, spread evenly across the days that remain. Returns null when no
 * budget is set, so the UI can ask for one instead of inventing a number.
 */
export function computeSafeToSpend(
  profile: Profile,
  spentThisMonth: number,
  spentThisWeek: number,
  now: Date,
): SafeToSpend {
  const budget = profile.monthly_budget != null ? Number(profile.monthly_budget) : null;
  const local = localParts(now, profile.timezone);
  const daysInMonth = new Date(Date.UTC(local.year, local.month, 0)).getUTCDate();
  const daysLeft = Math.max(1, daysInMonth - local.day + 1);

  if (budget == null || budget <= 0) {
    return {
      amount: null,
      monthlyBudget: null,
      spentThisMonth,
      remainingThisMonth: 0,
      daysLeft,
      leftThisWeek: null,
    };
  }

  const remaining = Math.max(0, budget - spentThisMonth);
  const perDay = remaining / daysLeft;
  const weeklyAllowance = (budget / daysInMonth) * 7;

  return {
    amount: Math.round(perDay * 100) / 100,
    monthlyBudget: budget,
    spentThisMonth,
    remainingThisMonth: Math.round(remaining * 100) / 100,
    daysLeft,
    leftThisWeek: Math.round(Math.max(0, weeklyAllowance - spentThisWeek) * 100) / 100,
  };
}

/**
 * The one-tap chips. Ranked by how often something recurs, then recency —
 * a thing bought eight times last month beats a one-off from yesterday.
 * The amount offered is the most recent one, since prices drift.
 */
export function computeRepeats(expenses: Expense[], limit = 6): RepeatItem[] {
  const groups = new Map<
    string,
    { item: string; count: number; latest: Expense; lastAt: number }
  >();

  for (const expense of expenses) {
    const key = expense.item.trim().toLowerCase();
    if (!key) continue;
    const at = new Date(expense.spent_at).getTime();
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { item: expense.item.trim(), count: 1, latest: expense, lastAt: at });
    } else {
      existing.count += 1;
      if (at > existing.lastAt) {
        existing.lastAt = at;
        existing.latest = expense;
      }
    }
  }

  return [...groups.values()]
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
    .slice(0, limit)
    .map((g) => ({
      item: g.item,
      amount: Number(g.latest.amount),
      currency: g.latest.currency,
      category: g.latest.category,
      need_level: g.latest.need_level,
      count: g.count,
    }));
}

/**
 * The line shown after saving an entry. A statement of fact, never praise
 * and never a scold — something the person did not know a second ago.
 */
export function statementFor(
  expense: Expense,
  monthExpenses: Expense[],
  weekExpenses: Expense[],
  currency: string,
): string {
  const money = (n: number) => formatMoney(n, currency);
  const category = expense.category;

  if (category) {
    const sameCategoryThisWeek = weekExpenses.filter((e) => e.category === category).length;
    if (sameCategoryThisWeek >= 2) {
      const ordinal = ["", "first", "second", "third", "fourth", "fifth"][
        Math.min(sameCategoryThisWeek, 5)
      ];
      return `That is your ${ordinal || `${sameCategoryThisWeek}th`} ${category.toLowerCase()} spend this week.`;
    }
  }

  const sameItem = monthExpenses.filter(
    (e) => e.item.trim().toLowerCase() === expense.item.trim().toLowerCase(),
  );
  if (sameItem.length >= 3) {
    const total = sameItem.reduce((sum, e) => sum + Number(e.base_amount), 0);
    return `${sameItem.length} × ${expense.item} this month — ${money(total)} in total.`;
  }

  const todayTotal = weekExpenses
    .filter((e) => e.spent_at.slice(0, 10) === expense.spent_at.slice(0, 10))
    .reduce((sum, e) => sum + Number(e.base_amount), 0);
  if (todayTotal > 0) return `${money(todayTotal)} logged today.`;

  return `Logged ${money(Number(expense.base_amount))}.`;
}

async function fetchRange(
  supabase: SupabaseClient,
  userId: string,
  startUtc: Date,
  endUtc: Date,
): Promise<Expense[]> {
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .gte("spent_at", startUtc.toISOString())
    .lt("spent_at", endUtc.toISOString())
    .order("spent_at", { ascending: false });
  return (data ?? []) as Expense[];
}

/** Everything the home screen needs, in three queries. */
export async function buildDashboard(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<DashboardData> {
  const now = new Date();
  const tz = profile.timezone;
  const today = localDateString(now, tz);

  const month = periodRange("monthly", tz, now);
  const week = periodRange("weekly", tz, now);

  // 90 days covers the streak, the repeat chips and the month, in one read.
  const historyStart = addDays(today, -89);
  const historyWindow = utcWindow(historyStart, today, tz);
  const history = await fetchRange(
    supabase,
    profile.id,
    historyWindow.startUtc,
    historyWindow.endUtc,
  );

  const inMonth = history.filter((e) => {
    const t = new Date(e.spent_at).getTime();
    return t >= month.startUtc.getTime() && t < month.endUtc.getTime();
  });
  const inWeek = history.filter((e) => {
    const t = new Date(e.spent_at).getTime();
    return t >= week.startUtc.getTime() && t < week.endUtc.getTime();
  });
  const todays = history.filter((e) => localDateString(new Date(e.spent_at), tz) === today);

  const sum = (rows: Expense[]) => rows.reduce((n, e) => n + (Number(e.base_amount) || 0), 0);
  const round = (n: number) => Math.round(n * 100) / 100;

  const loggedDates = new Set(history.map((e) => localDateString(new Date(e.spent_at), tz)));
  const streak = computeStreak(loggedDates, today);

  const dayTotals = new Map<string, number>();
  for (const e of history) {
    const d = localDateString(new Date(e.spent_at), tz);
    dayTotals.set(d, (dayTotals.get(d) ?? 0) + (Number(e.base_amount) || 0));
  }
  streak.week = eachDay(addDays(today, -6), today).map((date) => ({
    date,
    total: round(dayTotals.get(date) ?? 0),
    logged: loggedDates.has(date),
  }));

  const safeToSpend = computeSafeToSpend(profile, round(sum(inMonth)), round(sum(inWeek)), now);

  const { data: budgetRows } = await supabase
    .from("category_budgets")
    .select("*")
    .eq("user_id", profile.id);

  return {
    currency: profile.base_currency,
    today: {
      total: round(sum(todays)),
      needs: round(sum(todays.filter((e) => e.need_level === "need"))),
      wants: round(sum(todays.filter((e) => e.need_level === "want"))),
      unclear: round(sum(todays.filter((e) => e.need_level === "unclear"))),
      count: todays.length,
    },
    safeToSpend,
    streak,
    repeats: computeRepeats(history),
    expenses: todays,
    insight: buildInsight(
      inMonth,
      (budgetRows ?? []) as CategoryBudget[],
      profile.base_currency,
      safeToSpend,
      streak,
    ),
  };
}

/**
 * The floating card. Advice, never a warning — and only when there is
 * something concrete to say, otherwise nothing is shown at all.
 */
function buildInsight(
  monthExpenses: Expense[],
  budgets: CategoryBudget[],
  currency: string,
  safe: SafeToSpend,
  streak: StreakInfo,
): DashboardData["insight"] {
  const money = (n: number) => formatMoney(n, currency);

  // An envelope running low is the most actionable thing we can surface.
  const spentByCategory = new Map<string, number>();
  for (const e of monthExpenses) {
    const key = e.category ?? "Other";
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + (Number(e.base_amount) || 0));
  }

  const tight = budgets
    .map((b) => {
      const spent = spentByCategory.get(b.category) ?? 0;
      return { category: b.category, left: Number(b.amount) - spent, budget: Number(b.amount) };
    })
    .filter((b) => b.budget > 0 && b.left >= 0 && b.left / b.budget <= 0.2)
    .sort((a, b) => a.left / a.budget - b.left / b.budget)[0];

  if (tight) {
    return {
      kind: "budget",
      category: tight.category,
      left: Math.round(tight.left * 100) / 100,
      text: `You have ${money(tight.left)} left for ${tight.category.toLowerCase()} this month. Keeping tomorrow light keeps both the budget and your streak alive.`,
    };
  }

  if (safe.amount != null && safe.remainingThisMonth > 0 && safe.daysLeft <= 7) {
    return {
      kind: "info",
      text: `${money(safe.remainingThisMonth)} left with ${safe.daysLeft} days to go — about ${money(safe.amount)} a day.`,
    };
  }

  if (streak.current >= 3 && !streak.loggedToday) {
    return {
      kind: "info",
      text: `${streak.current} days logged in a row. One entry today keeps it going.`,
    };
  }

  return null;
}
