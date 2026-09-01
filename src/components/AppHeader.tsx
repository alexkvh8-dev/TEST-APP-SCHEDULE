import Link from "next/link";

/** "Ali Raza" -> "AR", "ali@example.com" -> "A". */
function initialsFor(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/**
 * The app bar, on every signed-in screen.
 *
 * The avatar is the way into settings. It used to be a gear on the home screen
 * only, which meant that on four of the five tabs there was no visible way to
 * reach your own account at all — and a gear reads as "preferences", not as
 * "you". Initials in a circle is the convention people already know.
 */
export function AppHeader({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string | null;
}) {
  return (
    <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pb-1 pt-4">
      <Link href="/" className="flex items-center gap-2" aria-label="FinX home">
        <svg width="22" height="22" viewBox="0 0 100 100" aria-hidden>
          {/* The mark, flattened to two facets per leaf at this size. */}
          <polygon points="38,90 30,66 40,40 50,30 52,88" fill="#22b24c" />
          <polygon points="30,66 17,74 31,78" fill="#117a38" />
          <polygon points="26,80 12,88 27,90 34,92" fill="#08542c" />
          <polygon points="58,90 57,58 64,22 70,18 78,44 82,66 73,88" fill="currentColor" />
          <polygon points="82,4.5 89.4,8.8 89.4,17.3 82,21.5 74.6,17.3 74.6,8.8" fill="currentColor" />
        </svg>
        <span className="text-base font-extrabold tracking-tight">FinX</span>
      </Link>

      <Link
        href="/settings"
        aria-label="Your profile and settings"
        className="flex size-9 items-center justify-center rounded-full text-xs font-extrabold"
        style={{ background: "var(--ink)", color: "var(--card)" }}
      >
        {initialsFor(fullName, email)}
      </Link>
    </header>
  );
}
