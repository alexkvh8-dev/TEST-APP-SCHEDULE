import Link from "next/link";

import { Logo } from "@/components/Logo";

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
        <Logo size={22} />
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
