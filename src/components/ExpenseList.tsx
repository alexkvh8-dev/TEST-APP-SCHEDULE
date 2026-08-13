"use client";

import { useState } from "react";

import { formatMoney } from "@/lib/currency";
import type { Expense, NeedLevel } from "@/lib/types";

const NEED_STYLE: Record<NeedLevel, { label: string; color: string }> = {
  need: { label: "Need", color: "var(--series-needs)" },
  want: { label: "Want", color: "var(--series-wants)" },
  unclear: { label: "Unsorted", color: "var(--series-unclear)" },
};

const NEXT_LEVEL: Record<NeedLevel, NeedLevel> = {
  need: "want",
  want: "need",
  unclear: "need",
};

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
  const [rows, setRows] = useState<Record<string, NeedLevel>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (!expenses.length) {
    return (
      <p
        className="rounded-2xl px-4 py-8 text-center text-sm"
        style={{ border: "1px dashed var(--grid)", color: "var(--text-muted)" }}
      >
        {emptyMessage}
      </p>
    );
  }

  /** Tapping the badge corrects the classifier — the label is a suggestion. */
  async function toggleNeed(expense: Expense) {
    const current = rows[expense.id] ?? expense.need_level;
    const next = NEXT_LEVEL[current];
    setRows((prev) => ({ ...prev, [expense.id]: next }));

    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ need_level: next }),
    });

    if (!res.ok) setRows((prev) => ({ ...prev, [expense.id]: current }));
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
        const level = rows[expense.id] ?? expense.need_level;
        const style = NEED_STYLE[level];

        return (
          <li
            key={expense.id}
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{expense.item}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleNeed(expense)}
                  className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                  title="Tap to switch between need and want"
                >
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full"
                    style={{ background: style.color }}
                  />
                  {style.label}
                </button>
                {expense.category && (
                  <span style={{ color: "var(--text-muted)" }}>{expense.category}</span>
                )}
                {expense.currency !== currency && (
                  <span style={{ color: "var(--text-muted)" }}>
                    {formatMoney(Number(expense.amount), expense.currency)}
                  </span>
                )}
              </div>
            </div>

            <div className="tabular shrink-0 text-sm font-semibold">
              {formatMoney(Number(expense.base_amount), currency)}
            </div>

            {onRemoved && (
              <button
                type="button"
                onClick={() => remove(expense)}
                disabled={busy === expense.id}
                aria-label={`Delete ${expense.item}`}
                className="shrink-0 rounded-lg p-1.5 disabled:opacity-50"
                style={{ color: "var(--text-muted)" }}
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
