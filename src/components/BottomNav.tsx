"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: "M3 11.5 12 4l9 7.5M5.5 10v9h13v-9" },
  { href: "/reports", label: "Reports", icon: "M4 20V10m5 10V4m5 16v-7m5 7V8" },
  { href: "/coach", label: "Coach", icon: "M21 12a8 8 0 1 1-3.2-6.4M4 20l1.6-4" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 12h2m14 0h2M12 3v2m0 14v2" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30"
      style={{
        background: "color-mix(in srgb, var(--surface-1) 92%, transparent)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px]"
                style={{ color: active ? "var(--series-needs)" : "var(--text-muted)" }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
