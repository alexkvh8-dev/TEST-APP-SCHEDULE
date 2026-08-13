import { Suspense } from "react";
import { redirect } from "next/navigation";

import type { DayDatum } from "@/components/charts";
import { TodayScreen } from "@/components/TodayScreen";
import { addDays, eachDay, localDateString, localParts, shortLabel, utcWindow } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

function greetingFor(hour: number): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const now = new Date();
  const local = localParts(now, profile.timezone);
  const today = localDateString(now, profile.timezone);
  const weekStart = addDays(today, -6);

  const window = utcWindow(weekStart, today, profile.timezone);
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)
    .gte("spent_at", window.startUtc.toISOString())
    .lt("spent_at", window.endUtc.toISOString())
    .order("spent_at", { ascending: false });

  const expenses = (data ?? []) as Expense[];

  const buckets = new Map<string, DayDatum>();
  for (const date of eachDay(weekStart, today)) {
    buckets.set(date, {
      date,
      label: shortLabel(date, "weekly"),
      needs: 0,
      wants: 0,
      unclear: 0,
    });
  }

  for (const expense of expenses) {
    const day = localDateString(new Date(expense.spent_at), profile.timezone);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    const amount = Number(expense.base_amount) || 0;
    if (expense.need_level === "need") bucket.needs += amount;
    else if (expense.need_level === "want") bucket.wants += amount;
    else bucket.unclear += amount;
  }

  const todaysExpenses = expenses.filter(
    (e) => localDateString(new Date(e.spent_at), profile.timezone) === today,
  );

  const todayLabel = new Date(
    Date.UTC(local.year, local.month - 1, local.day),
  ).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <Suspense>
      <TodayScreen
        initialExpenses={todaysExpenses}
        week={[...buckets.values()]}
        currency={profile.base_currency}
        greeting={greetingFor(local.hour)}
        todayLabel={todayLabel}
      />
    </Suspense>
  );
}
