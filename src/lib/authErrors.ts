/**
 * Supabase auth errors, translated.
 *
 * The raw messages are written for whoever wired the project up, not for the
 * person trying to sign in — "over_email_send_rate_limit" tells a stranger
 * nothing, and worse, it tells them nothing *actionable*, so they try again
 * and fail again. Each case below says what happened and what to do next.
 *
 * The unknown case deliberately does not echo the raw message: it can carry
 * internal detail, and a sentence the user cannot act on is not worth the
 * confusion.
 */

export type AuthFailure =
  | "bad-credentials"
  | "unconfirmed"
  | "already-registered"
  | "rate-limited"
  | "email-undeliverable"
  | "weak-password"
  | "bad-email"
  | "expired-code"
  | "unknown";

export interface TranslatedError {
  kind: AuthFailure;
  message: string;
}

export function translateAuthError(err: unknown): TranslatedError {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  const haystack = `${code} ${raw}`.toLowerCase();

  if (haystack.includes("invalid login credentials")) {
    return {
      kind: "bad-credentials",
      message: "That email and password do not match an account.",
    };
  }

  if (haystack.includes("email not confirmed") || haystack.includes("email_not_confirmed")) {
    return {
      kind: "unconfirmed",
      message: "Confirm your email first — we can send the message again below.",
    };
  }

  if (
    haystack.includes("already registered") ||
    haystack.includes("user_already_exists") ||
    haystack.includes("already been registered")
  ) {
    return {
      kind: "already-registered",
      message: "That email already has an account. Sign in instead.",
    };
  }

  // Supabase's own throttle, and the per-address cooldown between sends.
  if (
    haystack.includes("rate limit") ||
    haystack.includes("rate_limit") ||
    haystack.includes("for security purposes") ||
    haystack.includes("too many requests")
  ) {
    return {
      kind: "rate-limited",
      message: "Too many attempts just now. Wait a minute and try again.",
    };
  }

  /*
   * The one that matters when the project has no SMTP of its own: Supabase's
   * shared mailer refuses, and without this the person sees a raw 500 and has
   * no idea their account was created but unusable.
   */
  if (
    haystack.includes("error sending confirmation") ||
    haystack.includes("error sending recovery") ||
    haystack.includes("error sending") ||
    haystack.includes("smtp")
  ) {
    return {
      kind: "email-undeliverable",
      message:
        "We could not send that email. This is a problem on our side, not yours — please try again shortly.",
    };
  }

  if (haystack.includes("password") && (haystack.includes("weak") || haystack.includes("short"))) {
    return { kind: "weak-password", message: "Pick a longer, less common password." };
  }

  if (haystack.includes("invalid format") || haystack.includes("unable to validate email")) {
    return { kind: "bad-email", message: "That does not look like a valid email address." };
  }

  if (haystack.includes("expired") || haystack.includes("invalid token") || haystack.includes("otp")) {
    return {
      kind: "expired-code",
      message: "That code is wrong or has expired. Send a new one.",
    };
  }

  return { kind: "unknown", message: "Something went wrong. Try again in a moment." };
}
