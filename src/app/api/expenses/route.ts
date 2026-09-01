import { randomUUID } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";

import { classifyExpense } from "@/lib/ai";
import { DEFAULT_CURRENCY, isSupportedCurrency } from "@/lib/currency";
import { statementFor } from "@/lib/dashboard";
import { periodRange } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { convert } from "@/lib/rates";
import { createClient } from "@/lib/supabase/server";
import type { Expense, ExpenseSource, NeedLevel, Period } from "@/lib/types";

const PERIODS: Period[] = ["daily", "weekly", "monthly"];
const NEED_LEVELS: NeedLevel[] = ["need", "want", "unclear"];
const SOURCES: ExpenseSource[] = ["manual", "voice", "receipt", "repeat"];

/** GET /api/expenses?period=daily|weekly|monthly  (default: latest 50) */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const periodParam = request.nextUrl.searchParams.get("period");

  let query = supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("spent_at", { ascending: false });

  if (periodParam && PERIODS.includes(periodParam as Period)) {
    const range = periodRange(periodParam as Period, profile.timezone);
    query = query
      .gte("spent_at", range.startUtc.toISOString())
      .lt("spent_at", range.endUtc.toISOString());
  } else {
    query = query.limit(50);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ expenses: data, currency: profile.base_currency });
}

interface IncomingItem {
  item?: unknown;
  amount?: unknown;
  currency?: unknown;
  note?: unknown;
  category?: unknown;
  need_level?: unknown;
  spent_at?: unknown;
}

/**
 * POST /api/expenses
 *   { item, amount, ... }              one entry
 *   { items: [...], merchant, source } a batch, e.g. a split receipt
 *
 * Entries that arrive already classified (voice, receipts, repeat taps) keep
 * their labels. Only a bare manual entry gets sent to the classifier, and
 * that runs after the response so saving always feels instant.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const source: ExpenseSource = SOURCES.includes(body.source as ExpenseSource)
    ? (body.source as ExpenseSource)
    : "manual";

  const incoming: IncomingItem[] = Array.isArray(body.items)
    ? (body.items as IncomingItem[])
    : [body as IncomingItem];

  if (!incoming.length) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  if (incoming.length > 60) {
    return NextResponse.json({ error: "That is too many entries at once" }, { status: 400 });
  }

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const groupId = incoming.length > 1 ? randomUUID() : null;

  const rows: Record<string, unknown>[] = [];

  for (const raw of incoming) {
    const item = typeof raw.item === "string" ? raw.item.trim() : "";
    const amount = Number(raw.amount);
    const currency = isSupportedCurrency(raw.currency)
      ? raw.currency
      : profile.base_currency || DEFAULT_CURRENCY;

    if (!item || item.length > 200) {
      return NextResponse.json({ error: "Every entry needs a name" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
      return NextResponse.json(
        { error: `Enter an amount greater than zero for "${item}"` },
        { status: 400 },
      );
    }

    let spentAt = new Date();
    if (typeof raw.spent_at === "string") {
      const parsed = new Date(raw.spent_at);
      if (!Number.isNaN(parsed.getTime())) spentAt = parsed;
    }

    const { rate, converted } = await convert(amount, currency, profile.base_currency);

    rows.push({
      user_id: user.id,
      item,
      amount,
      currency,
      base_amount: converted,
      rate_to_base: rate,
      note: typeof raw.note === "string" && raw.note.trim() ? raw.note.trim().slice(0, 280) : null,
      category: typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : null,
      need_level: NEED_LEVELS.includes(raw.need_level as NeedLevel)
        ? (raw.need_level as NeedLevel)
        : "unclear",
      spent_at: spentAt.toISOString(),
      group_id: groupId,
      source,
    });
  }

  const { data: saved, error } = await supabase.from("expenses").insert(rows).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const expenses = (saved ?? []) as Expense[];

  // The statement shown under the total. A fact, not praise and not a scold.
  let statement: string | null = null;
  try {
    const month = periodRange("monthly", profile.timezone);
    const week = periodRange("weekly", profile.timezone);
    const { data: recent } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("spent_at", month.startUtc.toISOString())
      .lt("spent_at", month.endUtc.toISOString());

    const monthRows = (recent ?? []) as Expense[];
    const weekRows = monthRows.filter((e) => {
      const t = new Date(e.spent_at).getTime();
      return t >= week.startUtc.getTime() && t < week.endUtc.getTime();
    });

    statement =
      expenses.length > 1
        ? `${expenses.length} entries saved from one receipt.`
        : statementFor(expenses[0], monthRows, weekRows, profile.base_currency);
  } catch {
    // A missing statement is cosmetic; the entry is already saved.
  }

  // Only bare manual entries need the classifier.
  const needsClassifying = expenses.filter((e) => !e.category && e.need_level === "unclear");
  if (needsClassifying.length) {
    after(async () => {
      try {
        const { data: recent } = await supabase
          .from("expenses")
          .select("item")
          .eq("user_id", user.id)
          .order("spent_at", { ascending: false })
          .limit(20);
        const recentItems = (recent ?? []).map((r) => r.item as string);

        for (const expense of needsClassifying) {
          const result = await classifyExpense(
            expense.item,
            Number(expense.amount),
            expense.currency,
            recentItems,
          );
          await supabase
            .from("expenses")
            .update({ category: result.category, need_level: result.need_level })
            .eq("id", expense.id)
            .eq("user_id", user.id);
        }
      } catch {
        // Already saved; the period summary re-judges it later.
      }
    });
  }

  return NextResponse.json(
    { expenses, expense: expenses[0], statement, group_id: groupId },
    { status: 201 },
  );
}
