"use client";

import { useState } from "react";

import { formatMoney } from "@/lib/currency";
import type { Expense, NeedLevel } from "@/lib/types";

const NEXT_LEVEL: Record<NeedLevel, NeedLevel> = {
  need: "want",
  want: "need",
  unclear: "need",
};

const LABEL: Record<NeedLevel, string> = {
  need: "Need",
  want: "Want",
  unclear: "Unsorted",
};

/*
 * A glyph per category, so a list of twelve rows can be read by shape before
 * it is read by word. Anything unmatched gets the neutral receipt mark rather
 * than a wrong-but-confident icon.
 */
const ICONS: { match: RegExp; path: string }[] = [
  { match: /food|eat|restaurant|cafe|chai|tea|coffee|snack|grocer/i, path: "M7 3v8m0 0v10M4 3v5a3 3 0 0 0 6 0V3m7 0c-1.5 2-2 4-2 6.5 0 1.6.7 2.5 2 2.5v9" },
  { match: /transport|fuel|petrol|taxi|uber|bus|travel|car|ride/i, path: "M5 17h14M6 17v2m12-2v2M4 13l1.4-4.2A2 2 0 0 1 7.3 7.4h9.4a2 2 0 0 1 1.9 1.4L20 13v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3Zm3 0h.01M17 13h.01" },
  { match: /bill|rent|utilit|electric|gas|water|internet|phone/i, path: "M4 21V8l8-5 8 5v13M9 21v-6h6v6" },
  { match: /health|medic|pharm|doctor|hospital/i, path: "M12 6v12M6 12h12" },
  { match: /shop|cloth|wear|store|market/i, path: "M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2" },
  { match: /fun|entertain|movie|game|subscription|netflix|music/i, path: "M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm10-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" },
  { match: /educat|book|school|course|fee/i, path: "M3 7l9-4 9 4-9 4-9-4Zm3 5v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" },
];

const FALLBACK_ICON = "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 6h6M9 13h6";

function iconFor(expense: Expense): string {
  const haystack = `${expense.category ?? ""} ${expense.item}`;
  return ICONS.find((icon) => icon.match.test(haystack))?.path ?? FALLBACK_ICON;
}

export function ExpenseList({
  expenses,
  currency,
  onRemoved,
  emptyMessage = "No spending in this period.",
}: {
  expenses: Expense[];
  currency: string;
  onRemoved?: (id: string) => void;
  emptyMessage?: string;
}) {
  const [levels, setLevels] = useState<Record<string, NeedLevel>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (!expenses.length) {
    return (
      <p
        className="rounded-[22px] px-4 py-8 text-center text-sm"
        style={{ background: "var(--card)", color: "var(--muted)" }}
      >
        {emptyMessage}
      </p>
    );
  }

  /** Tapping the badge corrects the classifier — the label is a suggestion. */
  async function toggleNeed(expense: Expense) {
    const current = levels[expense.id] ?? expense.need_level;
    const next = NEXT_LEVEL[current];
    setLevels((prev) => ({ ...prev, [expense.id]: next }));

    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ need_level: next }),
    });

    if (!res.ok) setLevels((prev) => ({ ...prev, [expense.id]: current }));
  }

  async function remove(expense: Expense) {
    setBusy(expense.id);
    const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) onRemoved?.(expense.id);
  }

  return (
    <ul className="flex flex-col gap-2">
      {expenses.map((expense) => {
        const level = levels[expense.id] ?? expense.need_level;
        const isWant = level === "want";

        return (
          <li key={expense.id} className="card flex items-center gap-3 px-3.5 py-3">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: isWant ? "var(--wants-soft)" : "var(--field)",
                color: isWant ? "var(--wants)" : "var(--ink-2)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={iconFor(expense)} />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{expense.item}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleNeed(expense)}
                  className="font-semibold"
                  style={{ color: isWant ? "var(--wants)" : "var(--muted)" }}
                  title="Tap to switch between need and want"
                >
                  {LABEL[level]}
                </button>
                {expense.category && (
                  <span className="truncate" style={{ color: "var(--muted)" }}>
                    · {expense.category}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="num text-base">{formatMoney(Number(expense.base_amount), currency)}</p>
              {expense.currency !== currency && (
                <p className="tabular text-[11px]" style={{ color: "var(--muted)" }}>
                  {formatMoney(Number(expense.amount), expense.currency)}
                </p>
              )}
            </div>

            {onRemoved && (
              <button
                type="button"
                onClick={() => remove(expense)}
                disabled={busy === expense.id}
                aria-label={`Delete ${expense.item}`}
                className="shrink-0 rounded-lg p-1.5 disabled:opacity-50"
                style={{ color: "var(--muted)" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13" />
                </svg>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
