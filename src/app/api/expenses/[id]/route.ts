import { NextResponse, type NextRequest } from "next/server";

import { isSupportedCurrency } from "@/lib/currency";
import { getOrCreateProfile } from "@/lib/profile";
import { convert } from "@/lib/rates";
import { createClient } from "@/lib/supabase/server";
import type { NeedLevel } from "@/lib/types";

const NEED_LEVELS: NeedLevel[] = ["need", "want", "unclear"];

/** PATCH /api/expenses/:id — edit an entry or correct its need/want label. */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
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

  if (typeof body.item === "string" && body.item.trim()) patch.item = body.item.trim().slice(0, 200);
  if (typeof body.note === "string") patch.note = body.note.trim() || null;
  if (typeof body.category === "string" && body.category.trim()) patch.category = body.category.trim();

  if (typeof body.need_level === "string") {
    if (!NEED_LEVELS.includes(body.need_level as NeedLevel)) {
      return NextResponse.json({ error: "Invalid need_level" }, { status: 400 });
    }
    patch.need_level = body.need_level;
  }

  if (body.amount !== undefined || body.currency !== undefined) {
    const { data: existing } = await supabase
      .from("expenses")
      .select("amount, currency")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const amount = body.amount !== undefined ? Number(body.amount) : Number(existing.amount);
    const currency = isSupportedCurrency(body.currency) ? body.currency : existing.currency;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter an amount greater than zero" }, { status: 400 });
    }

    const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
    const { rate, converted } = await convert(amount, currency, profile.base_currency);
    patch.amount = amount;
    patch.currency = currency;
    patch.base_amount = converted;
    patch.rate_to_base = rate;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ expense: data });
}

/** DELETE /api/expenses/:id */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
