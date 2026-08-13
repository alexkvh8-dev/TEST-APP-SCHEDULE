"use client";

import { useEffect, useRef, useState } from "react";

import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currency";
import type { Expense } from "@/lib/types";

export function AddExpenseSheet({
  open,
  onClose,
  onAdded,
  defaultCurrency = DEFAULT_CURRENCY,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (expense: Expense) => void;
  defaultCurrency?: string;
}) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    // Let the sheet finish animating in before pulling up the keyboard.
    const timer = setTimeout(() => itemRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = Number(amount);
    if (!item.trim()) return setError("What did you spend on?");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than zero");

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: item.trim(), amount: value, currency, note }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save that");

      onAdded(body.expense as Expense);
      setItem("");
      setAmount("");
      setNote("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)" }}
      />

      <form
        onSubmit={submit}
        className="rise relative w-full max-w-lg rounded-t-3xl p-5 sm:rounded-3xl"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
      >
        <div
          aria-hidden
          className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden"
          style={{ background: "var(--axis)" }}
        />

        <h2 id="add-expense-title" className="mb-4 text-lg font-semibold">
          Add a spend
        </h2>

        <label className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
          What did you spend on?
        </label>
        <input
          ref={itemRef}
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Chai, petrol, groceries…"
          maxLength={200}
          className="mb-4 w-full rounded-xl px-3.5 py-3 text-base outline-none"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />

        <label className="mb-1.5 block text-xs" style={{ color: "var(--text-secondary)" }}>
          How much?
        </label>
        <div className="mb-4 flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            inputMode="decimal"
            placeholder="0"
            className="tabular min-w-0 flex-1 rounded-xl px-3.5 py-3 text-2xl font-semibold outline-none"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
            className="rounded-xl px-3 py-3 text-sm font-medium outline-none"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          maxLength={280}
          className="mb-4 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />

        {error && (
          <p className="mb-3 text-sm" style={{ color: "var(--critical)" }} role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--series-needs)" }}
          >
            {saving ? "Saving…" : "Add spend"}
          </button>
        </div>
      </form>
    </div>
  );
}
