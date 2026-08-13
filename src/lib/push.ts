import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

let configured = false;

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function ensureConfigured() {
  if (configured) return;
  if (!pushConfigured()) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path opened when the notification is tapped. */
  url?: string;
  /** Collapses same-tag notifications so nudges never stack up. */
  tag?: string;
}

/**
 * Send to every device a user has registered. Subscriptions rejected with
 * 404/410 are gone for good (uninstalled PWA, cleared site data) and are
 * deleted so the table does not grow stale endpoints.
 */
export async function sendToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!pushConfigured()) return 0;
  ensureConfigured();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return 0;

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.id);
      }
    }),
  );

  if (dead.length) await supabase.from("push_subscriptions").delete().in("id", dead);
  return sent;
}
