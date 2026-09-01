import { NextResponse, type NextRequest } from "next/server";

import { parseVoice } from "@/lib/ai";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/**
 * POST /api/voice  { transcript }
 *
 * Speech-to-text happens in the browser; this only turns the words into
 * fields. Nothing is saved here — the app shows the result for review first.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { transcript?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return NextResponse.json({ error: "Nothing was said" }, { status: 400 });
  if (transcript.length > 500) {
    return NextResponse.json({ error: "That was a bit long — try one spend at a time" }, { status: 400 });
  }

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const parsed = await parseVoice(transcript, profile.base_currency);

  return NextResponse.json({ ...parsed, transcript, currency: profile.base_currency });
}
