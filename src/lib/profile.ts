import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_CURRENCY } from "./currency";
import type { Profile } from "./types";

/**
 * Read the caller's profile, creating it if the signup trigger has not run
 * (e.g. the schema was installed after the account already existed).
 */
export async function getOrCreateProfile(
  supabase: SupabaseClient,
  userId: string,
  fallback: { email?: string | null; full_name?: string | null; avatar_url?: string | null } = {},
): Promise<Profile> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (data) return data as Profile;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: fallback.email ?? null,
      full_name: fallback.full_name ?? null,
      avatar_url: fallback.avatar_url ?? null,
      base_currency: DEFAULT_CURRENCY,
    })
    .select("*")
    .single();

  if (error) throw error;
  return created as Profile;
}
