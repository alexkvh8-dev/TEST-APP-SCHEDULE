import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/OnboardingFlow";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome — FinX" };

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  // Answered once already; the questions never come back.
  if (profile.onboarded_at) redirect("/");

  return <OnboardingFlow profile={profile} />;
}
