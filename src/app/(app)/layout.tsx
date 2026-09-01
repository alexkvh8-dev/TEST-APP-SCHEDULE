import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/*
 * The onboarding gate lives here rather than in middleware: middleware runs on
 * every request including static assets, and a database read there would cost
 * a round trip on all of them. One check at the layout covers every signed-in
 * screen at once.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  if (!profile.onboarded_at) redirect("/welcome");

  return (
    <>
      <AppHeader fullName={profile.full_name} email={profile.email} />
      <div className="has-tabbar mx-auto w-full max-w-lg px-4 pt-2">{children}</div>
      <BottomNav />
    </>
  );
}
