import { NextResponse, type NextRequest } from "next/server";

import { formatMoney } from "@/lib/currency";
import { isAuthorizedCron } from "@/lib/cron";
import { localParts, periodRange } from "@/lib/periods";
import { pushConfigured, sendToUser } from "@/lib/push";
import { buildReport } from "@/lib/reports";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Period, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Weekly and monthly reports fire at this local hour. */
const REPORT_HOUR = 8;

interface Due {
  period: Period;
  /** A moment inside the period being reported on. */
  ref: Date;
}

/**
 * Which reports are due for this user right now?
 *
 * Weekly and monthly look one day back so they always cover a period that has
 * actually finished — Sunday 08:00 reports last Sun–Sat, the 1st reports the
 * whole previous month.
 */
function dueReports(now: Date, profile: Pick<Profile, "timezone" | "daily_summary_hour">): Due[] {
  const local = localParts(now, profile.timezone);
  const yesterday = new Date(now.getTime() - 86_400_000);
  const due: Due[] = [];

  if (local.hour === profile.daily_summary_hour) {
    due.push({ period: "daily", ref: now });
  }
  if (local.weekday === 0 && local.hour === REPORT_HOUR) {
    due.push({ period: "weekly", ref: yesterday });
  }
  if (local.day === 1 && local.hour === REPORT_HOUR) {
    due.push({ period: "monthly", ref: yesterday });
  }

  return due;
}

function notificationFor(
  period: Period,
  headline: string,
  total: number,
  currency: string,
): { title: string; body: string } {
  const amount = formatMoney(total, currency);
  if (period === "daily") return { title: `Today: ${amount}`, body: headline };
  if (period === "weekly") return { title: `Your week: ${amount}`, body: headline };
  return { title: `Last month: ${amount}`, body: headline };
}

/**
 * Runs hourly. Generates whichever reports are due in each user's own
 * timezone and pushes a one-line notification linking into the charts.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const { data: profiles, error } = await supabase.from("profiles").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const generated: string[] = [];
  const failed: string[] = [];

  for (const profile of (profiles ?? []) as Profile[]) {
    for (const { period, ref } of dueReports(now, profile)) {
      const range = periodRange(period, profile.timezone, ref);

      const { data: existing } = await supabase
        .from("insights")
        .select("pushed_at")
        .eq("user_id", profile.id)
        .eq("period", period)
        .eq("period_start", range.start)
        .maybeSingle();

      if (existing?.pushed_at) continue; // already delivered

      try {
        const report = await buildReport(supabase, profile, period, { ref, force: true });

        // Nothing spent in the period — skip the notification, keep the row so
        // the job does not retry every hour.
        if (report.stats.count > 0 && pushConfigured()) {
          const { title, body } = notificationFor(
            period,
            report.insight.headline,
            report.stats.total,
            profile.base_currency,
          );
          await sendToUser(supabase, profile.id, {
            title,
            body,
            url: `/reports?period=${period}`,
            tag: `paisa-report-${period}`,
          });
        }

        await supabase
          .from("insights")
          .update({ pushed_at: new Date().toISOString() })
          .eq("user_id", profile.id)
          .eq("period", period)
          .eq("period_start", range.start);

        generated.push(`${profile.id}:${period}:${range.start}`);
      } catch (err) {
        failed.push(`${profile.id}:${period}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }
  }

  return NextResponse.json({ generated: generated.length, failed, at: now.toISOString() });
}
