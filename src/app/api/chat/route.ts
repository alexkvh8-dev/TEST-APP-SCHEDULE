import { NextResponse, type NextRequest } from "next/server";

import {
  anthropic,
  coachSystemPrompt,
  hasAnthropicKey,
  isObviouslyOffTopic,
  MODEL,
} from "@/lib/anthropic";
import { formatMoney } from "@/lib/currency";
import { periodRange } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { buildStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { Expense, Profile } from "@/lib/types";

export const maxDuration = 60;

const OFF_TOPIC_REPLY =
  "I only cover money — spending, saving, budgeting and your expenses here. " +
  "Ask me something about that and I'm all yours.";

/** A compact picture of the last 30 days, cheap enough to send every turn. */
async function buildContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile,
): Promise<string> {
  const month = periodRange("monthly", profile.timezone);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", profile.id)
    .gte("spent_at", thirtyDaysAgo.toISOString())
    .order("spent_at", { ascending: false });

  const expenses = (data ?? []) as Expense[];
  if (!expenses.length) {
    return "They have not logged any expenses in the last 30 days yet.";
  }

  const stats = buildStats(
    expenses,
    { ...month, start: month.start, end: month.end },
    profile.base_currency,
    profile.timezone,
    0,
  );
  const money = (n: number) => formatMoney(n, profile.base_currency);

  const lines = [
    `Base currency: ${profile.base_currency}. Timezone: ${profile.timezone}.`,
    profile.monthly_budget
      ? `Monthly budget: ${money(Number(profile.monthly_budget))}.`
      : "No monthly budget set.",
    `Last 30 days: ${money(expenses.reduce((s, e) => s + Number(e.base_amount), 0))} across ${expenses.length} purchases.`,
    `Needs ${money(stats.needs_total)} | Wants ${money(stats.wants_total)} | Unclassified ${money(stats.unclear_total)} (this calendar month).`,
    "",
    "Top categories (last 30 days):",
    ...stats.by_category.slice(0, 8).map((c) => `- ${c.category}: ${money(c.total)} (${c.count}x)`),
    "",
    "Most recent purchases:",
    ...expenses
      .slice(0, 15)
      .map((e) => `- ${e.spent_at.slice(0, 10)} ${e.item}: ${money(Number(e.base_amount))} [${e.need_level}]`),
  ];

  return lines.join("\n");
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

  if (!hasAnthropicKey()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 503 });
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

  // Fast path: refuse plainly without spending a model call.
  if (isObviouslyOffTopic(message)) {
    await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role: "assistant", content: OFF_TOPIC_REPLY });
    return new Response(OFF_TOPIC_REPLY, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const context = await buildContext(supabase, profile);

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(21); // 20 previous turns + the message just inserted

  const messages = (history ?? [])
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));

  const stream = anthropic().messages.stream({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: coachSystemPrompt(context),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        stream.on("text", (delta) => {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        });
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          const note = full ? "" : OFF_TOPIC_REPLY;
          if (note) {
            full = note;
            controller.enqueue(encoder.encode(note));
          }
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
    cancel() {
      stream.abort();
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
