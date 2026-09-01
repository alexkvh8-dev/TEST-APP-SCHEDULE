import { Suspense } from "react";
import { redirect } from "next/navigation";

import { TodayScreen } from "@/components/TodayScreen";
import { buildDashboard } from "@/lib/dashboard";
import { localParts } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

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
  const data = await buildDashboard(supabase, profile);

  const todayLabel = new Date(Date.UTC(local.year, local.month - 1, local.day)).toLocaleDateString(
    "en-US",
    { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" },
  );

  return (
    <Suspense>
      <TodayScreen initial={data} greeting={greetingFor(local.hour)} todayLabel={todayLabel} />
    </Suspense>
  );
}
