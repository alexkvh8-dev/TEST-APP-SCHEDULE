import { redirect } from "next/navigation";

import { SettingsScreen } from "@/components/SettingsScreen";
import { providerLabel } from "@/lib/ai";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Paisa" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);

  return <SettingsScreen profile={profile} aiProvider={providerLabel()} />;
}
