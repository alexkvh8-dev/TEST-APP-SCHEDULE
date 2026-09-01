import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "New password — FinX" };

/*
 * Deliberately outside the (app) group.
 *
 * That layout sends anyone who has not finished onboarding to /welcome, and
 * someone who signed up, never answered the questions, then forgot their
 * password would be bounced away from the one page they came here for.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 pt-10">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Choose a new password</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--ink-2)" }}>
        You are signed in from the reset link. Set one you will remember.
      </p>
      <ResetPasswordForm email={user.email} />
    </main>
  );
}
