"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function AuthForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const destination = next?.startsWith("/") ? next : "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError("Enter your email");
    if (password.length < 8) return setError("Password must be at least 8 characters");

    setBusy(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });

        if (signUpError) throw signUpError;

        // With email confirmation switched off in Supabase, signUp returns a
        // live session and we can go straight in. With it on, there is no
        // session until the user clicks the link in their inbox.
        if (!data.session) {
          setNotice(
            "Account created. Check your email for a confirmation link, then sign in.",
          );
          setMode("signin");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }

      // A full refresh so the server components pick up the new session cookie.
      router.push(destination);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message === "Invalid login credentials"
          ? "That email and password do not match an account."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError("Enter your email first, then tap reset.");
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setBusy(false);
    if (resetError) setError(resetError.message);
    else setNotice("If that email has an account, a reset link is on its way.");
  }

  const fieldStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  } as const;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="mb-1 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--surface-2)" }}
      >
        {(
          [
            ["signin", "Sign in"],
            ["signup", "Create account"],
          ] as [Mode, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
              setNotice(null);
            }}
            className="flex-1 rounded-lg py-2 text-sm font-medium"
            style={{
              background: mode === value ? "var(--surface-1)" : "transparent",
              color: mode === value ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: mode === value ? "var(--shadow)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-xl px-3.5 py-3 text-base outline-none"
          style={fieldStyle}
        />
      </label>

      <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="mt-1.5 w-full rounded-xl px-3.5 py-3 text-base outline-none"
          style={fieldStyle}
        />
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm" style={{ color: "var(--good)" }} role="status">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-1 w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: "var(--series-needs)" }}
      >
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      {mode === "signin" && (
        <button
          type="button"
          onClick={resetPassword}
          disabled={busy}
          className="text-xs underline underline-offset-2 disabled:opacity-60"
          style={{ color: "var(--text-muted)" }}
        >
          Forgot your password?
        </button>
      )}

      <p className="mt-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        Your data is tied to this email — sign in on any device to see all of it.
      </p>
    </form>
  );
}
