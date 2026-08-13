import { NextResponse, type NextRequest } from "next/server";

import { getOrCreateProfile } from "@/lib/profile";
import { buildReport, trendSeries } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/types";

const PERIODS: Period[] = ["daily", "weekly", "monthly"];
const TREND_POINTS: Record<Period, number> = { daily: 14, weekly: 8, monthly: 6 };

export const maxDuration = 60;

/** GET /api/insights?period=daily|weekly|monthly[&refresh=1] */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const periodParam = request.nextUrl.searchParams.get("period") ?? "daily";
  if (!PERIODS.includes(periodParam as Period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  const period = periodParam as Period;
  const force = request.nextUrl.searchParams.get("refresh") === "1";

  try {
    const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
    const [report, trend] = await Promise.all([
      buildReport(supabase, profile, period, { force }),
      trendSeries(supabase, profile, period, TREND_POINTS[period]),
    ]);

    return NextResponse.json({
      period,
      label: report.label,
      range: { start: report.range.start, end: report.range.end },
      currency: profile.base_currency,
      monthly_budget: profile.monthly_budget,
      stats: report.stats,
      insight: report.insight,
      trend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build the report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
