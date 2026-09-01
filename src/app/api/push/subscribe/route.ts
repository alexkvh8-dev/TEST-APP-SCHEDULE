import { NextResponse, type NextRequest } from "next/server";

import { pushConfigured, sendToUser } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";

interface BrowserSubscription {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/** POST /api/push/subscribe — register this device. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!pushConfigured()) {
    return NextResponse.json({ error: "Push is not configured on the server" }, { status: 503 });
  }

  let body: { subscription?: BrowserSubscription };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendToUser(supabase, user.id, {
    title: "Reminders are on",
    body: "I'll nudge you when nothing's been logged for a while.",
    url: "/",
    tag: "paisa-setup",
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe — unregister this device. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let endpoint: string | undefined;
  try {
    ({ endpoint } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
