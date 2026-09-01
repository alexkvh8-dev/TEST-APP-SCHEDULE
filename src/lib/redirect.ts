/**
 * Where a `?next=` parameter is allowed to send someone.
 *
 * `value.startsWith("/")` is not enough, and that is what this used to do.
 * `//evil.com` starts with a slash and browsers read it as a protocol-relative
 * URL, so a link like `/login?next=//evil.com` would sign you in and then hand
 * you to an attacker's page — with your session freshly minted and the referrer
 * showing you came from the real app. Backslashes get the same treatment
 * because some browsers normalise `\` to `/`.
 *
 * Anything that is not a plain in-app path falls back to the home screen.
 */
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (value.length > 512) return fallback;

  // Control characters can smuggle a newline into a Location header, so they
  // are rejected before anything else looks at the string.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(value)) return fallback;

  // Must be a rooted path, and must not open a scheme or an authority.
  if (!value.startsWith("/")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/^\/(\/|%2f)/i.test(value)) return fallback;

  return value;
}
