import { redirect } from "next/navigation";

import { BudgetScreen } from "@/components/BudgetScreen";
import { periodLabel, periodRange } from "@/lib/periods";
import { getOrCreateProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(supabase, user.id, user.user_metadata);
  const month = periodRange("monthly", profile.timezone);

  return <BudgetScreen initialMonthLabel={periodLabel(month)} />;
}
