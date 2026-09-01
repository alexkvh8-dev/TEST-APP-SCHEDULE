"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MIN_PASSWORD_LENGTH, PASSWORD_RULES, checkPassword } from "@/lib/password";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm({ email }: { email?: string | null }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // The same policy the signup form enforces — a reset must not be a way
  // around it.
  const verdict = checkPassword(password, email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!verdict.ok) return setError(verdict.message);
    if (password !== confirm) return setError("Those two do not match");

    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  const fieldStyle = { background: "var(--field)", color: "var(--ink)" } as const;

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        placeholder="New password"
        aria-label="New password"
        className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
        style={fieldStyle}
      />

      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
        placeholder="Type it again"
        aria-label="Confirm new password"
        className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
        style={fieldStyle}
      />

      {password && (
        <ul className="flex flex-col gap-1">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li
                key={rule.id}
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: met ? "var(--good)" : "var(--muted)" }}
              >
                <span aria-hidden>{met ? "✓" : "○"}</span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-lime px-4 py-3.5 text-sm">
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
