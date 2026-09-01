import { Suspense } from "react";

import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/redirect";

export const metadata = { title: "Sign in — FinX" };

/*
 * Deliberately bare.
 *
 * A sign-in screen has one job. The marketing bullets that used to sit under
 * the form were read by nobody — everyone landing here has already decided to
 * use the app — and they pushed the actual fields up under the fold on a
 * phone.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <svg width="56" height="56" viewBox="0 0 100 100" aria-hidden className="mb-4">
            <polygon points="38,90 30,66 40,40 50,30 52,88" fill="#22b24c" />
            <polygon points="30,66 17,74 31,78" fill="#117a38" />
            <polygon points="26,80 12,88 27,90 34,92" fill="#08542c" />
            <polygon
              points="58,90 57,58 64,22 70,18 78,44 82,66 73,88"
              fill="var(--ink)"
            />
            <polygon
              points="82,4.5 89.4,8.8 89.4,17.3 82,21.5 74.6,17.3 74.6,8.8"
              fill="var(--ink)"
            />
          </svg>
          <h1 className="text-3xl font-extrabold tracking-tight">FinX</h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--ink-2)" }}>
            Every rupee, tracked.
          </p>
        </div>

        {/*
          Only a fixed set of messages is shown. An arbitrary string from the
          URL would let anyone put their own words on a page that looks like
          ours — "account locked, call this number" is a phishing page you did
          not have to build.
        */}
        {error && (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-sm font-medium"
            style={{ background: "var(--card)", color: "var(--critical)" }}
            role="alert"
          >
            {safeAuthError(error)}
          </div>
        )}

        <Suspense>
          <AuthForm next={safeNext(next)} />
        </Suspense>

        <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Your data is tied to this email. Sign in on any device to see all of it.
        </p>
      </div>
    </main>
  );
}

/** Maps whatever arrives in `?error=` onto one of our own sentences. */
function safeAuthError(raw: string): string {
  const value = raw.toLowerCase();
  if (value.includes("expired")) return "That link has expired. Request a new one.";
  if (value.includes("token") || value.includes("code")) {
    return "That link is not valid any more. Request a new one.";
  }
  if (value.includes("already")) return "That email already has an account. Sign in instead.";
  return "Something went wrong with that link. Try signing in again.";
}
