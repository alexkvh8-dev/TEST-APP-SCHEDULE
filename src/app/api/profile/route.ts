import { NextResponse, type NextRequest } from "next/server";

import { isSupportedCurrency } from "@/lib/currency";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  return NextResponse.json({ profile });
}

/** PATCH /api/profile — settings screen. */
export async function PATCH(request: NextRequest) {
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

  const patch: Record<string, unknown> = {};

  if (body.base_currency !== undefined) {
    if (!isSupportedCurrency(body.base_currency)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }
    patch.base_currency = body.base_currency;
  }

  if (body.timezone !== undefined) {
    const tz = String(body.timezone);
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
    } catch {
      return NextResponse.json({ error: "Unknown timezone" }, { status: 400 });
    }
    patch.timezone = tz;
  }

  if (body.monthly_budget !== undefined) {
    if (body.monthly_budget === null || body.monthly_budget === "") {
      patch.monthly_budget = null;
    } else {
      const budget = Number(body.monthly_budget);
      if (!Number.isFinite(budget) || budget < 0) {
        return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
      }
      patch.monthly_budget = budget;
    }
  }

  if (body.reminders_enabled !== undefined) {
    patch.reminders_enabled = Boolean(body.reminders_enabled);
  }

  for (const key of ["reminder_start_hour", "reminder_end_hour", "daily_summary_hour"] as const) {
    if (body[key] === undefined) continue;
    const hour = Number(body[key]);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return NextResponse.json({ error: `${key} must be an hour from 0 to 23` }, { status: 400 });
    }
    patch[key] = hour;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Make sure the row exists before patching it.
  await getOrCreateProfile(supabase, user.id, user.user_metadata);

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
