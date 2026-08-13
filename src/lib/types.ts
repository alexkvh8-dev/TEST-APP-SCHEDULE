export type NeedLevel = "need" | "want" | "unclear";
export type Period = "daily" | "weekly" | "monthly";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  base_currency: string;
  timezone: string;
  monthly_budget: number | null;
  reminders_enabled: boolean;
  reminder_start_hour: number;
  reminder_end_hour: number;
  last_reminder_at: string | null;
  daily_summary_hour: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  item: string;
  amount: number;
  currency: string;
  base_amount: number;
  rate_to_base: number;
  note: string | null;
  category: string | null;
  need_level: NeedLevel;
  spent_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * What Claude returns for a period summary. Deliberately small: the app is
 * chart-first, so the model gets a tight token budget for prose.
 */
export interface InsightPayload {
  /** One line, <= 90 chars. The only text shown large on the report. */
  headline: string;
  /** 1-2 short sentences of context. */
  verdict: string;
  /** Share of spend that was genuinely necessary, 0-100. */
  needs_pct: number;
  /** Amount (in base currency) the model judges was avoidable. */
  could_have_saved: number;
  /** At most 3 items, each <= 100 chars, phrased as an action. */
  tips: string[];
  /** Items the model flagged as the clearest avoidable spends. */
  flagged: { item: string; amount: number; why: string }[];
}

export interface Insight {
  id: string;
  user_id: string;
  period: Period;
  period_start: string;
  period_end: string;
  payload: InsightPayload;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/** Aggregations computed in SQL/JS and fed to both the charts and the model. */
export interface PeriodStats {
  period: Period;
  start: string;
  end: string;
  currency: string;
  total: number;
  count: number;
  needs_total: number;
  wants_total: number;
  unclear_total: number;
  /** Daily totals across the period, gap-filled with zeroes. */
  by_day: { date: string; total: number; needs: number; wants: number; unclear: number }[];
  /** Descending by total. */
  by_category: { category: string; total: number; count: number }[];
  /** Descending by amount, capped by the caller. */
  top_expenses: { item: string; amount: number; need_level: NeedLevel; spent_at: string }[];
  /** Same-length previous period, for the delta arrow. */
  previous_total: number;
}
