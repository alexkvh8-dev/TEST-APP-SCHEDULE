import { NextResponse, type NextRequest } from "next/server";

import { isSupportedCountry } from "@/lib/countries";
import { isSupportedCurrency } from "@/lib/currency";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { PrimaryGoal } from "@/lib/types";

const GOALS: PrimaryGoal[] = ["save", "debt", "awareness", "budget"];

/**
 * POST /api/onboarding — the one write the welcome flow makes.
 *
 * Separate from PATCH /api/profile because it also stamps `onboarded_at`,
 * which nothing else may set. Everything but the country is optional; the
 * app has to work for someone who declined to say what they earn.
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

  if (!isSupportedCountry(body.country)) {
    return NextResponse.json({ error: "Pick a country from the list" }, { status: 400 });
  }
  if (!isSupportedCurrency(body.base_currency)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const timezone = String(body.timezone ?? "");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return NextResponse.json({ error: "Unknown timezone" }, { status: 400 });
  }

  const money = (value: unknown, field: string) => {
    if (value === null || value === undefined || value === "") return null;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) {
      throw new Error(`Enter a valid ${field}`);
    }
    return Math.round(amount * 100) / 100;
  };

  let monthlyIncome: number | null;
  let monthlyBudget: number | null;
  try {
    monthlyIncome = money(body.monthly_income, "monthly income");
    monthlyBudget = money(body.monthly_budget, "monthly budget");
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const fullName =
    typeof body.full_name === "string" && body.full_name.trim()
      ? body.full_name.trim().slice(0, 80)
      : null;

  const goal = GOALS.includes(body.primary_goal as PrimaryGoal)
    ? (body.primary_goal as PrimaryGoal)
    : null;

  await getOrCreateProfile(supabase, user.id, user.user_metadata);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      country: body.country,
      base_currency: body.base_currency,
      timezone,
      monthly_income: monthlyIncome,
      monthly_budget: monthlyBudget,
      primary_goal: goal,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
