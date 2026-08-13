import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCron, withinHours } from "@/lib/cron";
import { localParts } from "@/lib/periods";
import { pushConfigured, sendToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INACTIVITY_MS = 90 * 60 * 1000; // 1.5 hours
/** Never nudge twice inside this window, even if the user stays inactive. */
const REMINDER_COOLDOWN_MS = 3 * 60 * 60 * 1000;

/**
 * Runs every 15 minutes. Nudges anyone who has logged nothing for 90 minutes,
 * but only during their own waking hours.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ skipped: "push not configured" });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, timezone, reminders_enabled, reminder_start_hour, reminder_end_hour, last_reminder_at, created_at",
    )
    .eq("reminders_enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profiles?.length) return NextResponse.json({ notified: 0, considered: 0 });

  // One query for everyone: anything logged inside the inactivity window means
  // the user is active. Absence of a row is itself the signal.
  const since = new Date(now.getTime() - INACTIVITY_MS).toISOString();
  const { data: recent } = await supabase
    .from("expenses")
    .select("user_id")
    .gte("created_at", since)
    .in(
      "user_id",
      profiles.map((p) => p.id),
    );

  const activeUsers = new Set((recent ?? []).map((r) => r.user_id as string));

  let notified = 0;

  for (const row of profiles as Pick<
    Profile,
    | "id"
    | "timezone"
    | "reminders_enabled"
    | "reminder_start_hour"
    | "reminder_end_hour"
    | "last_reminder_at"
    | "created_at"
  >[]) {
    if (activeUsers.has(row.id)) continue;

    const { hour } = localParts(now, row.timezone);
    if (!withinHours(hour, row.reminder_start_hour, row.reminder_end_hour)) continue;

    if (row.last_reminder_at) {
      const sinceLastNudge = now.getTime() - new Date(row.last_reminder_at).getTime();
      if (sinceLastNudge < REMINDER_COOLDOWN_MS) continue;
    }

    // Brand-new accounts get a moment to settle in before the first nudge.
    if (now.getTime() - new Date(row.created_at).getTime() < INACTIVITY_MS) continue;

    const sent = await sendToUser(supabase, row.id, {
      title: "Spent anything?",
      body: "Nothing logged in the last 90 minutes. Tap to add it before you forget.",
      url: "/?add=1",
      tag: "paisa-nudge",
    });

    if (sent > 0) {
      notified += 1;
      await supabase
        .from("profiles")
        .update({ last_reminder_at: now.toISOString() })
        .eq("id", row.id);
    }
  }

  return NextResponse.json({ notified, considered: profiles.length });
}
