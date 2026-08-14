import { Suspense } from "react";

import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in — Paisa" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: "var(--series-needs)", color: "#fff" }}
            aria-hidden
          >
            ₨
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Paisa</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Track every rupee you spend. See where it went in graphs, not
            spreadsheets.
          </p>
        </div>

        {error && (
          <div
            className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--critical)",
              color: "var(--critical)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <Suspense>
          <AuthForm next={next} />
        </Suspense>

        <ul
          className="mt-8 flex flex-col gap-3 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          <li className="flex gap-3">
            <span aria-hidden>📈</span>
            <span>Daily, weekly and monthly reports — mostly graphs.</span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden>🧠</span>
            <span>An honest read on which spends were needs and which were wants.</span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden>🔔</span>
            <span>A nudge if you have not logged anything for 90 minutes.</span>
          </li>
        </ul>
      </div>
    </main>
  );
}
