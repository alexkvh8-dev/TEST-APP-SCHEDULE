"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AddExpenseSheet, type AddPrefill } from "@/components/AddExpenseSheet";
import { ExpenseList } from "@/components/ExpenseList";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { SafeToSpendCard } from "@/components/SafeToSpendCard";
import { StreakCard } from "@/components/StreakCard";
import { VoiceLogOverlay } from "@/components/VoiceLogOverlay";
import { formatMoney } from "@/lib/currency";
import type { DashboardData, Expense } from "@/lib/types";

type Overlay = "none" | "add" | "voice" | "scan";

export function TodayScreen({
  initial,
  greeting,
  todayLabel,
}: {
  initial: DashboardData;
  greeting: string;
  todayLabel: string;
}) {
  const [data, setData] = useState(initial);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [prefill, setPrefill] = useState<AddPrefill | null>(null);
  const [statement, setStatement] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const currency = data.currency;

  // Both the reminder notification and the tab-bar button deep-link to
  // /?add=1, so the sheet is already open by the time the app finishes loading.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setPrefill(null);
      setOverlay("add");
    }
  }, [searchParams]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData((await res.json()) as DashboardData);
    } catch {
      // The optimistic state on screen is still correct enough to keep using.
    }
  }, []);

  const handleAdded = useCallback(
    (added: Expense[], line: string | null) => {
      setData((prev) => {
        const expenses = [...added, ...prev.expenses];
        const sum = (rows: Expense[], level?: Expense["need_level"]) =>
          rows
            .filter((e) => !level || e.need_level === level)
            .reduce((n, e) => n + (Number(e.base_amount) || 0), 0);
        return {
          ...prev,
          expenses,
          today: {
            total: sum(expenses),
            needs: sum(expenses, "need"),
            wants: sum(expenses, "want"),
            unclear: sum(expenses, "unclear"),
            count: expenses.length,
          },
          streak: prev.streak.loggedToday
            ? prev.streak
            : { ...prev.streak, current: prev.streak.current + 1, loggedToday: true },
        };
      });

      // The statement is the whole point of the confirmation: a fact, not a
      // "well done" and not a telling-off.
      setStatement(line);
      // The classifier labels bare manual entries just after the response.
      setTimeout(refresh, 2500);
    },
    [refresh],
  );

  const handleRemoved = useCallback(
    (id: string) => {
      setData((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
      setTimeout(refresh, 300);
    },
    [refresh],
  );

  useEffect(() => {
    if (!statement) return;
    const timer = setTimeout(() => setStatement(null), 5000);
    return () => clearTimeout(timer);
  }, [statement]);

  function openAdd(next: AddPrefill | null) {
    setPrefill(next);
    setOverlay("add");
  }

  const spentToday = data.today.total;
  const safe = data.safeToSpend;
  // The intervention only fires when there is a budget to be over, and only
  // once the day's own allowance is actually gone.
  const overToday = safe.amount != null && safe.amount > 0 && spentToday > safe.amount;

  return (
    <div className="flex flex-col gap-3.5 pb-4">
      <header>
        <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
          {todayLabel}
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">{greeting}</h1>
      </header>

      {data.insight && (
        <Link
          href="/reports"
          className="flex items-center gap-3 rounded-full py-2.5 pl-3 pr-4"
          style={{ background: "var(--lime)", color: "var(--lime-ink)" }}
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(22,21,15,0.12)" }}
            aria-hidden
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18h6m-5 3h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">
            {data.insight.text}
          </span>
        </Link>
      )}

      <SafeToSpendCard
        safe={safe}
        spentToday={spentToday}
        currency={currency}
        over={overToday}
      />

      <StreakCard streak={data.streak} currency={currency} />

      {/* Three ways in. Typing is the default, the other two are for when your
          hands are full or the receipt is long. */}
      <div className="grid grid-cols-3 gap-2.5">
        <QuickAction
          label="Add"
          path="M12 5v14M5 12h14"
          onClick={() => openAdd(null)}
          primary
        />
        <QuickAction
          label="Speak"
          path="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0m7 7v3"
          onClick={() => setOverlay("voice")}
        />
        <QuickAction
          label="Scan"
          path="M4 8V6a2 2 0 0 1 2-2h2m8 0h2a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1-2 2h-2m-8 0H6a2 2 0 0 1-2-2v-2M7 12h10"
          onClick={() => setOverlay("scan")}
        />
      </div>

      {data.repeats.length > 0 && (
        <section>
          <h2 className="label mb-2">Log again</h2>
          <div className="scroll-x -mx-4 flex gap-2 px-4 pb-1">
            {data.repeats.map((repeat) => (
              <button
                key={repeat.item}
                type="button"
                onClick={() =>
                  openAdd({
                    item: repeat.item,
                    amount: repeat.amount,
                    category: repeat.category,
                    need_level: repeat.need_level,
                    source: "repeat",
                  })
                }
                className="chip flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-sm font-semibold"
              >
                <span>{repeat.item}</span>
                <span className="tabular" style={{ color: "var(--muted)" }}>
                  {formatMoney(repeat.amount, repeat.currency)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="label">Today</h2>
          <span className="num text-sm" style={{ color: "var(--ink-2)" }}>
            {formatMoney(spentToday, currency)}
          </span>
        </div>
        <ExpenseList
          expenses={data.expenses}
          currency={currency}
          onRemoved={handleRemoved}
          emptyMessage="Nothing logged yet today."
        />
      </section>

      {/* The statement. It sits above the tab bar, says one true thing, and
          leaves on its own. */}
      {statement && (
        <div
          role="status"
          className="rise fixed inset-x-4 z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold"
          style={{
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            background: "var(--ink)",
            color: "var(--card)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {statement}
        </div>
      )}

      <AddExpenseSheet
        open={overlay === "add"}
        onClose={() => setOverlay("none")}
        onAdded={handleAdded}
        defaultCurrency={currency}
        prefill={prefill}
        onVoice={() => setOverlay("voice")}
        onScan={() => setOverlay("scan")}
      />

      <VoiceLogOverlay
        open={overlay === "voice"}
        onClose={() => setOverlay("none")}
        onParsed={(next) => openAdd(next)}
      />

      <ReceiptScanner
        open={overlay === "scan"}
        onClose={() => setOverlay("none")}
        onSaved={handleAdded}
        currency={currency}
      />
    </div>
  );
}

function QuickAction({
  label,
  path,
  onClick,
  primary = false,
}: {
  label: string;
  path: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 text-xs font-bold"
      style={{
        background: primary ? "var(--lime)" : "var(--card)",
        color: primary ? "var(--lime-ink)" : "var(--ink)",
        boxShadow: primary ? "none" : "var(--shadow)",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={path} />
      </svg>
      {label}
    </button>
  );
}
