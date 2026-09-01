import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands here from an email confirmation or a password-reset link.
 *
 * Supabase sends either `?code=` (PKCE) or `?token_hash=&type=` depending on
 * the project's email template, so both are handled.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  const fail = (message: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);

  if (error) return fail(error);

  const supabase = await createClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return fail(exchangeError.message);
  } else if (tokenHash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (otpError) return fail(otpError.message);
  } else {
    return fail("That link is missing its confirmation token.");
  }

  // Behind a proxy the public origin differs from the internal one.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "production" && forwardedHost ? `https://${forwardedHost}` : origin;

  return NextResponse.redirect(`${base}${next}`);
}
