import { NextResponse, type NextRequest } from "next/server";

import { isObviouslyOffTopic, OFF_TOPIC_REPLY, streamCoach } from "@/lib/ai";
import { formatMoney } from "@/lib/currency";
import { periodRange } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { LIMITS, rateLimit } from "@/lib/ratelimit";
import { buildStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { Expense, PeriodStats, Profile } from "@/lib/types";

export const maxDuration = 60;

/**
 * A compact picture of the last 30 days. The text goes to the model; the stats
 * object backs the rules engine when no provider is configured.
 */
async function buildContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile,
): Promise<{ context: string; stats: PeriodStats }> {
  const month = periodRange("monthly", profile.timezone);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", profile.id)
    .gte("spent_at", thirtyDaysAgo.toISOString())
    .order("spent_at", { ascending: false });

  const expenses = (data ?? []) as Expense[];

  // Totals cover every row passed in, i.e. the last 30 days; the range only
  // shapes the per-day buckets, which this context does not use.
  const stats = buildStats(expenses, month, profile.base_currency, profile.timezone, 0);

  if (!expenses.length) {
    return { context: "They have not logged any expenses in the last 30 days yet.", stats };
  }

  const money = (n: number) => formatMoney(n, profile.base_currency);

  const lines = [
    `Base currency: ${profile.base_currency}. Timezone: ${profile.timezone}.`,
    profile.monthly_budget
      ? `Monthly budget: ${money(Number(profile.monthly_budget))}.`
      : "No monthly budget set.",
    `Last 30 days: ${money(stats.total)} across ${expenses.length} purchases.`,
    `Of that: needs ${money(stats.needs_total)}, wants ${money(stats.wants_total)}, unclassified ${money(stats.unclear_total)}.`,
    "",
    "Top categories (last 30 days):",
    ...stats.by_category.slice(0, 8).map((c) => `- ${c.category}: ${money(c.total)} (${c.count}x)`),
    "",
    "Most recent purchases:",
    ...expenses
      .slice(0, 15)
      .map(
        (e) =>
          `- ${e.spent_at.slice(0, 10)} ${e.item}: ${money(Number(e.base_amount))} [${e.need_level}]`,
      ),
  ];

  return { context: lines.join("\n"), stats };
}

/** GET /api/chat — conversation history. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ messages: data ?? [] });
}

/** DELETE /api/chat — clear the conversation. */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await supabase.from("chat_messages").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

/** POST /api/chat  { message } -> streamed plain-text reply. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const quota = rateLimit(user.id, "chat", LIMITS.chat);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "The coach needs a breather. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(quota.retryAfter) } },
    );
  }

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  if (message.length > 4000) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  await supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: message });

  // Fast path: refuse plainly without spending a request against the quota.
  if (isObviouslyOffTopic(message)) {
    await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role: "assistant", content: OFF_TOPIC_REPLY });
    return new Response(OFF_TOPIC_REPLY, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const { context, stats } = await buildContext(supabase, profile);

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(21); // 20 previous turns + the message just inserted

  const turns = (history ?? [])
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of streamCoach(context, turns, stats)) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        const note = "\n\nSomething went wrong reaching the coach. Try again in a moment.";
        full += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        controller.close();
        if (full.trim()) {
          await supabase
            .from("chat_messages")
            .insert({ user_id: user.id, role: "assistant", content: full.trim() });
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
