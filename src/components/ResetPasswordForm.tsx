"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) return setError("Password must be at least 8 characters");

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

  return (
    <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
      <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
        New password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="mt-1.5 w-full rounded-xl px-3.5 py-3 text-base outline-none"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "var(--series-needs)" }}
      >
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
