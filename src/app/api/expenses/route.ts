import { after, NextResponse, type NextRequest } from "next/server";

import { classifyExpense } from "@/lib/ai";
import { DEFAULT_CURRENCY, isSupportedCurrency } from "@/lib/currency";
import { periodRange } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { convert } from "@/lib/rates";
import { createClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/types";

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

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

/** POST /api/expenses  { item, amount, currency?, note?, spent_at? } */
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

  const item = typeof body.item === "string" ? body.item.trim() : "";
  const amount = Number(body.amount);
  const currency = isSupportedCurrency(body.currency) ? body.currency : DEFAULT_CURRENCY;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!item || item.length > 200) {
    return NextResponse.json({ error: "Enter what you spent on (1–200 characters)" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
    return NextResponse.json({ error: "Enter an amount greater than zero" }, { status: 400 });
  }

  let spentAt = new Date();
  if (typeof body.spent_at === "string") {
    const parsed = new Date(body.spent_at);
    if (!Number.isNaN(parsed.getTime())) spentAt = parsed;
  }

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const { rate, converted } = await convert(amount, currency, profile.base_currency);

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      user_id: user.id,
      item,
      amount,
      currency,
      base_amount: converted,
      rate_to_base: rate,
      note,
      spent_at: spentAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Classification runs after the response so adding an expense stays instant.
  after(async () => {
    try {
      const { data: recent } = await supabase
        .from("expenses")
        .select("item")
        .eq("user_id", user.id)
        .neq("id", expense.id)
        .order("spent_at", { ascending: false })
        .limit(20);

      const result = await classifyExpense(
        item,
        amount,
        currency,
        (recent ?? []).map((r) => r.item as string),
      );

      await supabase
        .from("expenses")
        .update({ category: result.category, need_level: result.need_level })
        .eq("id", expense.id)
        .eq("user_id", user.id);
    } catch {
      // The expense is already saved; the period summary re-judges it later.
    }
  });

  return NextResponse.json({ expense }, { status: 201 });
}
