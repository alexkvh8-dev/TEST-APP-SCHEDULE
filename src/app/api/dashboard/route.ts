import { NextResponse } from "next/server";

import { buildDashboard } from "@/lib/dashboard";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/dashboard — everything the home screen renders. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
    const data = await buildDashboard(supabase, profile);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load your dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
