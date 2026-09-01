import { NextResponse, type NextRequest } from "next/server";

import { parseReceipt } from "@/lib/ai";
import { getOrCreateProfile } from "@/lib/profile";
import { LIMITS, rateLimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB — a phone photo downscaled client-side
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * POST /api/receipt  { image: dataUrl }
 *
 * Reads a receipt photo into individual lines. Nothing is saved — the split
 * comes back for review, because a misread line in your ledger is worse than
 * no line at all.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const quota = rateLimit(user.id, "receipt", LIMITS.receipt);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "That is a lot of receipts in one hour. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfter) } },
    );
  }

  let body: { image?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image : "";
  const match = image.match(/^data:([\w/+.-]+);base64,(.+)$/);
  if (!match) return NextResponse.json({ error: "No photo received" }, { status: 400 });

  const [, mimeType, base64] = match;
  if (!ALLOWED.includes(mimeType)) {
    return NextResponse.json({ error: "That file type is not supported" }, { status: 400 });
  }
  if (base64.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is too large" }, { status: 413 });
  }

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);

  try {
    const parsed = await parseReceipt(base64, mimeType, profile.base_currency);

    if (!parsed.readable) {
      return NextResponse.json(
        { error: "Could not read that one. Try again with more light and the whole receipt in frame." },
        { status: 422 },
      );
    }

    return NextResponse.json({ ...parsed, currency: profile.base_currency });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read that receipt";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
