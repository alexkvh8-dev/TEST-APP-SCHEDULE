import { Suspense } from "react";
import { redirect } from "next/navigation";

import { TodayScreen } from "@/components/TodayScreen";
import { buildDashboard } from "@/lib/dashboard";
import { localParts } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function greetingFor(hour: number, name: string | null): string {
  const time =
    hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  // First name only — "Good morning, Muhammad Ali Raza" wraps to three lines.
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${time}, ${first}` : time;
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
      <TodayScreen initial={data} greeting={greetingFor(local.hour, profile.full_name)} todayLabel={todayLabel} />
    </Suspense>
  );
}
