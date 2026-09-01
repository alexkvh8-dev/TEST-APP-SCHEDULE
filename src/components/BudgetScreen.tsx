"use client";

import { useCallback, useEffect, useState } from "react";

import { formatMoney } from "@/lib/currency";
import type { CategoryBudget } from "@/lib/types";

interface Envelope extends CategoryBudget {
  spent: number;
}

interface BudgetData {
  budgets: Envelope[];
  unbudgeted: { category: string; spent: number }[];
  currency: string;
  monthly_budget: number | null;
}

/**
 * Envelopes, not a ledger.
 *
 * A budget only changes behaviour if you can see it before you spend, so this
 * screen is bars and remainders — never a table of what already happened.
 */
export function BudgetScreen({ initialMonthLabel }: { initialMonthLabel: string }) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/budgets");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load your budgets");
      setData(body as BudgetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your budgets");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEnvelope(category: string, amount: number) {
    setEditing(null);
    setError(null);
    const res = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save that envelope");
    }
    await load();
  }

  async function saveMonthly(value: number | null) {
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthly_budget: value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save that budget");
    }
    await load();
  }

  const currency = data?.currency ?? "PKR";

  return (
    <div className="flex flex-col gap-4 pb-4">
      <header>
        <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
          {initialMonthLabel}
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight">Budget</h1>
      </header>

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}

      {!data && (
        <div
          className="h-32 animate-pulse rounded-[22px]"
          style={{ background: "var(--field)" }}
          aria-label="Loading budgets"
        />
      )}

      {data && (
        <>
          {/* The monthly figure — this is what Safe-to-Spend divides up. */}
          <section
            className="p-5"
            style={{ background: "var(--ink)", color: "var(--card)", borderRadius: 22 }}
          >
            <p className="label" style={{ color: "rgba(255,255,255,0.55)" }}>
              Monthly budget
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <input
                key={String(data.monthly_budget)}
                defaultValue={data.monthly_budget ?? ""}
                onBlur={(e) =>
                  saveMonthly(e.target.value.trim() === "" ? null : Number(e.target.value))
                }
                inputMode="decimal"
                placeholder="Not set"
                aria-label="Monthly budget"
                className="num w-full bg-transparent text-4xl outline-none"
                style={{ color: "var(--lime)" }}
              />
            </div>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              Spread across the days left in the month, this is your safe-to-spend
              figure on the home screen.
            </p>
          </section>

          <section>
            <h2 className="label mb-2">Envelopes</h2>
            {data.budgets.length === 0 && (
              <p
                className="rounded-[22px] px-4 py-6 text-center text-sm"
                style={{ background: "var(--card)", color: "var(--muted)" }}
              >
                No envelopes yet. Add one below from what you already spend on.
              </p>
            )}

            <ul className="flex flex-col gap-2.5">
              {data.budgets.map((envelope) => {
                const pct = envelope.amount > 0 ? envelope.spent / envelope.amount : 1;
                const over = envelope.spent > envelope.amount;
                const left = envelope.amount - envelope.spent;

                return (
                  <li key={envelope.id} className="card p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-bold">{envelope.category}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(envelope.category);
                          setDraft(String(envelope.amount));
                        }}
                        className="tabular shrink-0 text-xs font-semibold"
                        style={{ color: "var(--muted)" }}
                      >
                        {formatMoney(envelope.amount, currency)} ✏︎
                      </button>
                    </div>

                    <div
                      className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full"
                      style={{ background: "var(--field)" }}
                      role="img"
                      aria-label={`${Math.round(pct * 100)} percent of the ${envelope.category} envelope used`}
                    >
                      <div
                        className="h-2.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(pct * 100, 2))}%`,
                          background: over ? "var(--wants)" : "var(--lime)",
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs font-semibold" style={{ color: "var(--ink-2)" }}>
                      {formatMoney(envelope.spent, currency)} spent ·{" "}
                      <span style={{ color: over ? "var(--wants)" : "var(--ink-2)" }}>
                        {over
                          ? `${formatMoney(-left, currency)} over`
                          : `${formatMoney(left, currency)} left`}
                      </span>
                    </p>

                    {editing === envelope.category && (
                      <EnvelopeEditor
                        value={draft}
                        onChange={setDraft}
                        onCancel={() => setEditing(null)}
                        onSave={() => saveEnvelope(envelope.category, Number(draft) || 0)}
                        onRemove={() => saveEnvelope(envelope.category, 0)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {data.unbudgeted.length > 0 && (
            <section>
              <h2 className="label mb-2">Spending with no envelope</h2>
              <ul className="flex flex-col gap-2">
                {data.unbudgeted.map((row) => (
                  <li
                    key={row.category}
                    className="card flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.category}</p>
                      <p className="tabular text-xs" style={{ color: "var(--muted)" }}>
                        {formatMoney(row.spent, currency)} this month
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(row.category);
                        // A round number just above what is already spent is a
                        // better starting point than a blank field.
                        setDraft(String(Math.max(100, Math.ceil(row.spent / 100) * 100)));
                      }}
                      className="btn-quiet shrink-0 px-4 py-2 text-xs"
                    >
                      Add envelope
                    </button>
                  </li>
                ))}
              </ul>

              {editing && !data.budgets.some((b) => b.category === editing) && (
                <div className="card mt-2 p-4">
                  <p className="text-sm font-bold">{editing}</p>
                  <EnvelopeEditor
                    value={draft}
                    onChange={setDraft}
                    onCancel={() => setEditing(null)}
                    onSave={() => saveEnvelope(editing, Number(draft) || 0)}
                  />
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EnvelopeEditor({
  value,
  onChange,
  onSave,
  onCancel,
  onRemove,
}: {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        autoFocus
        aria-label="Envelope amount"
        className="tabular min-w-0 flex-1 rounded-xl px-3 py-2.5 text-base outline-none"
        style={{ background: "var(--field)", color: "var(--ink)" }}
      />
      <button type="button" onClick={onSave} className="btn-lime px-4 py-2.5 text-sm">
        Save
      </button>
      <button type="button" onClick={onCancel} className="btn-quiet px-4 py-2.5 text-sm">
        Cancel
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-2.5 text-sm font-semibold"
          style={{ color: "var(--critical)" }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
