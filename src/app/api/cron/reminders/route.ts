import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCron, withinHours } from "@/lib/cron";
import { localParts } from "@/lib/periods";
import { pushConfigured, sendToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOUR_MS = 60 * 60 * 1000;
/** Used when a profile predates the setting. */
const DEFAULT_INTERVAL_HOURS = 4;
/** The widest window we ever have to look back over, for the single query. */
const MAX_INTERVAL_HOURS = 12;

/**
 * Runs every 15 minutes. Nudges anyone who has logged nothing for their own
 * chosen stretch — four hours by default — and only during their waking hours.
 *
 * The spacing is a setting rather than a constant because a reminder that
 * arrives too often stops being a reminder and becomes a reason to uninstall.
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
      "id, timezone, reminders_enabled, reminder_start_hour, reminder_end_hour, reminder_interval_hours, last_reminder_at, created_at",
    )
    .eq("reminders_enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profiles?.length) return NextResponse.json({ notified: 0, considered: 0 });

  // One query covering the longest interval anyone can pick; each profile is
  // then checked against its own, shorter window in memory.
  const since = new Date(now.getTime() - MAX_INTERVAL_HOURS * HOUR_MS).toISOString();
  const { data: recent } = await supabase
    .from("expenses")
    .select("user_id, created_at")
    .gte("created_at", since)
    .in(
      "user_id",
      profiles.map((p) => p.id),
    );

  // The most recent entry per user is all we need to judge inactivity.
  const lastEntry = new Map<string, number>();
  for (const row of recent ?? []) {
    const userId = row.user_id as string;
    const at = new Date(row.created_at as string).getTime();
    if (at > (lastEntry.get(userId) ?? 0)) lastEntry.set(userId, at);
  }

  let notified = 0;

  for (const row of profiles as Pick<
    Profile,
    | "id"
    | "timezone"
    | "reminders_enabled"
    | "reminder_start_hour"
    | "reminder_end_hour"
    | "reminder_interval_hours"
    | "last_reminder_at"
    | "created_at"
  >[]) {
    const intervalHours = Math.min(
      MAX_INTERVAL_HOURS,
      Math.max(2, Number(row.reminder_interval_hours) || DEFAULT_INTERVAL_HOURS),
    );
    const inactivityMs = intervalHours * HOUR_MS;

    const last = lastEntry.get(row.id);
    if (last && now.getTime() - last < inactivityMs) continue;

    const { hour } = localParts(now, row.timezone);
    if (!withinHours(hour, row.reminder_start_hour, row.reminder_end_hour)) continue;

    // Never nudge twice inside one interval, however long the quiet runs.
    if (row.last_reminder_at) {
      const sinceLastNudge = now.getTime() - new Date(row.last_reminder_at).getTime();
      if (sinceLastNudge < inactivityMs) continue;
    }

    // Brand-new accounts get a moment to settle in before the first nudge.
    if (now.getTime() - new Date(row.created_at).getTime() < inactivityMs) continue;

    const sent = await sendToUser(supabase, row.id, {
      title: "Spent anything?",
      body: `Nothing logged in the last ${intervalHours} hours. Tap to add it before you forget.`,
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
