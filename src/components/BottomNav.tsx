"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/*
 * Four destinations and one action. The action sits in the middle as a raised
 * lime circle because adding a spend is the thing people come here to do —
 * everything else is looking back at what they already did.
 */
const LEFT = [
  { href: "/", label: "Today", icon: "M3 11.5 12 4l9 7.5M5.5 10v9h13v-9" },
  { href: "/reports", label: "Analyze", icon: "M4 20V10m5 10V4m5 16v-7m5 7V8" },
];

const RIGHT = [
  {
    href: "/budget",
    label: "Budget",
    icon: "M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-7Zm12 3.5h4",
  },
  { href: "/coach", label: "Coach", icon: "M21 12a8 8 0 1 1-3.2-6.4M4 20l1.6-4" },
];

function Tab({ tab, active }: { tab: { href: string; label: string; icon: string }; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold"
      style={{ color: active ? "var(--ink)" : "var(--muted)" }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={tab.icon} />
      </svg>
      {tab.label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30" aria-label="Main">
      <div
        className="mx-auto flex max-w-lg items-stretch px-2"
        style={{
          background: "color-mix(in srgb, var(--card) 92%, transparent)",
          borderTop: "1px solid var(--line)",
          backdropFilter: "blur(14px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {LEFT.map((tab) => (
          <Tab key={tab.href} tab={tab} active={isActive(tab.href)} />
        ))}

        {/* The FAB overhangs the bar, so the bar keeps a plain flex row and the
            button is absolutely placed above it. */}
        <div className="relative w-16 shrink-0">
          <button
            type="button"
            onClick={() => router.push("/?add=1")}
            aria-label="Add a spend"
            className="btn-lime absolute left-1/2 flex size-14 -translate-x-1/2 items-center justify-center"
            style={{ top: -22, boxShadow: "0 8px 22px rgba(0,0,0,0.18)" }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {RIGHT.map((tab) => (
          <Tab key={tab.href} tab={tab} active={isActive(tab.href)} />
        ))}
      </div>
    </nav>
  );
}
