"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PASSWORD_RULES, checkPassword, passwordStrength } from "@/lib/password";
import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Stage = "form" | "verify";

export function AuthForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const destination = safeNext(next);
  const verdict = checkPassword(password, email);
  const strength = passwordStrength(password);

  function land() {
    // A full refresh so the server components pick up the new session cookie.
    router.push(destination);
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError("Enter your email");

    if (mode === "signup") {
      setTouched(true);
      if (!verdict.ok) return setError(verdict.message);
    } else if (!password) {
      return setError("Enter your password");
    }

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

        // With email confirmation on, signUp returns no session and Supabase
        // emails a 6-digit code. With it off, the session is live immediately
        // and there is nothing to verify.
        if (!data.session) {
          setStage("verify");
          setNotice(`We sent a 6-digit code to ${email.trim()}. It expires in an hour.`);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }

      land();
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

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const token = code.replace(/\D/g, "");
    if (token.length !== 6) return setError("Enter the 6-digit code from your email");

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: "signup",
      });
      if (otpError) throw otpError;
      land();
    } catch (err) {
      const message = err instanceof Error ? err.message : "That code did not work";
      setError(
        /expired|invalid/i.test(message)
          ? "That code is wrong or has expired. Send a new one."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (resendError) throw resendError;
      setNotice("A new code is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a new code");
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

  const fieldStyle = { background: "var(--field)", color: "var(--ink)" } as const;

  // ---- The verification step replaces the form entirely ---------------------
  if (stage === "verify") {
    return (
      <form onSubmit={verify} className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Check your email</h2>
        {notice && (
          <p className="text-sm" style={{ color: "var(--ink-2)" }} role="status">
            {notice}
          </p>
        )}

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-label="6-digit code"
          className="num w-full rounded-2xl py-4 text-center text-3xl tracking-[0.4em] outline-none"
          style={fieldStyle}
        />

        {error && (
          <p className="text-sm font-medium" style={{ color: "var(--critical)" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-lime w-full py-4 text-sm">
          {busy ? "Checking…" : "Verify and continue"}
        </button>

        <div className="flex justify-between text-xs font-semibold">
          <button
            type="button"
            onClick={resendCode}
            disabled={busy}
            className="underline underline-offset-2 disabled:opacity-60"
            style={{ color: "var(--ink-2)" }}
          >
            Send a new code
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("form");
              setCode("");
              setError(null);
              setNotice(null);
            }}
            className="underline underline-offset-2"
            style={{ color: "var(--muted)" }}
          >
            Use a different email
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="mb-1 flex gap-1 rounded-full p-1"
        style={{ background: "var(--field)" }}
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
              setTouched(false);
            }}
            className="flex-1 rounded-full py-2.5 text-sm font-bold"
            style={{
              background: mode === value ? "var(--card)" : "transparent",
              color: mode === value ? "var(--ink)" : "var(--muted)",
              boxShadow: mode === value ? "var(--shadow)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        inputMode="email"
        required
        placeholder="Email"
        aria-label="Email"
        className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
        style={fieldStyle}
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => setTouched(true)}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        required
        placeholder="Password"
        aria-label="Password"
        className="w-full rounded-2xl px-4 py-3.5 text-base outline-none"
        style={fieldStyle}
      />

      {/* The rules are shown while typing, not barked after submitting. */}
      {mode === "signup" && (password || touched) && (
        <div className="rise">
          {/* The unfilled track needs its own colour: at --field it vanished
              into the page and read as four stray lines under the input. */}
          <div className="mb-2.5 mt-1 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  background:
                    i < strength ? (strength >= 4 ? "var(--good)" : "var(--lime)") : "var(--border)",
                }}
              />
            ))}
          </div>
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
        </div>
      )}

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm" style={{ color: "var(--good)" }} role="status">
          {notice}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-lime mt-1 w-full py-4 text-sm">
        {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      {mode === "signin" && (
        <button
          type="button"
          onClick={resetPassword}
          disabled={busy}
          className="text-xs font-semibold underline underline-offset-2 disabled:opacity-60"
          style={{ color: "var(--muted)" }}
        >
          Forgot your password?
        </button>
      )}
    </form>
  );
}
