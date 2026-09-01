import { NextResponse, type NextRequest } from "next/server";

import { periodRange } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { CategoryBudget, Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/budgets — envelopes with this month's spend against each. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const month = periodRange("monthly", profile.timezone);

  const [{ data: budgetRows }, { data: expenseRows }] = await Promise.all([
    supabase.from("category_budgets").select("*").eq("user_id", user.id).order("category"),
    supabase
      .from("expenses")
      .select("category, base_amount")
      .eq("user_id", user.id)
      .gte("spent_at", month.startUtc.toISOString())
      .lt("spent_at", month.endUtc.toISOString()),
  ]);

  const spent = new Map<string, number>();
  for (const row of (expenseRows ?? []) as Pick<Expense, "category" | "base_amount">[]) {
    const key = row.category ?? "Other";
    spent.set(key, (spent.get(key) ?? 0) + (Number(row.base_amount) || 0));
  }

  const budgets = ((budgetRows ?? []) as CategoryBudget[]).map((b) => ({
    ...b,
    amount: Number(b.amount),
    spent: Math.round((spent.get(b.category) ?? 0) * 100) / 100,
  }));

  // Categories being spent on with no envelope yet, so they can be added.
  const unbudgeted = [...spent.entries()]
    .filter(([category]) => !budgets.some((b) => b.category === category))
    .map(([category, total]) => ({ category, spent: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.spent - a.spent);

  return NextResponse.json({
    budgets,
    unbudgeted,
    currency: profile.base_currency,
    monthly_budget: profile.monthly_budget,
    month: { start: month.start, end: month.end },
  });
}

/** PUT /api/budgets  { category, amount } — amount 0 removes the envelope. */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { category?: unknown; amount?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const category = typeof body.category === "string" ? body.category.trim().slice(0, 60) : "";
  const amount = Number(body.amount);

  if (!category) return NextResponse.json({ error: "Pick a category" }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Enter an amount of zero or more" }, { status: 400 });
  }

  await getOrCreateProfile(supabase, user.id, user.user_metadata);

  if (amount === 0) {
    await supabase.from("category_budgets").delete().eq("user_id", user.id).eq("category", category);
    return NextResponse.json({ ok: true, removed: true });
  }

  const { data, error } = await supabase
    .from("category_budgets")
    .upsert({ user_id: user.id, category, amount }, { onConflict: "user_id,category" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ budget: data });
}
