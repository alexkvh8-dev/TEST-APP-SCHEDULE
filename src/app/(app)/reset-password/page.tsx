import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "New password — Paisa" };

export default function ResetPasswordPage() {
  return (
    <main className="pt-6">
      <h1 className="mb-1 text-xl font-semibold">Choose a new password</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
        You are signed in from the reset link. Set a password you will remember.
      </p>
      <ResetPasswordForm />
    </main>
  );
}
