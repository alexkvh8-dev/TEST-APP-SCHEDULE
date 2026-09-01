"use client";

import { useEffect, useRef, useState } from "react";

import { Sheet } from "@/components/Sheet";
import { CURRENCIES, currencyMeta, DEFAULT_CURRENCY } from "@/lib/currency";
import type { Expense, ExpenseSource, NeedLevel } from "@/lib/types";

export interface AddPrefill {
  item?: string;
  amount?: number;
  category?: string | null;
  need_level?: NeedLevel;
  source?: ExpenseSource;
  /** 0 = today, -1 = yesterday. Set when the spoken words carried a day. */
  day_offset?: number;
}

/** Digits first, name second — the amount is what people arrive holding. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

export function AddExpenseSheet({
  open,
  onClose,
  onAdded,
  defaultCurrency = DEFAULT_CURRENCY,
  prefill,
  onVoice,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (expenses: Expense[], statement: string | null) => void;
  defaultCurrency?: string;
  prefill?: AddPrefill | null;
  onVoice?: () => void;
  onScan?: () => void;
}) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [need, setNeed] = useState<NeedLevel>("unclear");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const source = prefill?.source ?? "manual";
  const category = prefill?.category ?? null;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setItem(prefill?.item ?? "");
    setAmount(prefill?.amount != null ? String(prefill.amount) : "");
    setNeed(prefill?.need_level ?? "unclear");
    setNote("");
    setCurrency(defaultCurrency);
    // A prefilled sheet already knows the amount, so the cursor belongs in the
    // name field; a blank one starts on the numpad and needs no keyboard.
    if (prefill?.amount != null) {
      const timer = setTimeout(() => itemRef.current?.focus(), 140);
      return () => clearTimeout(timer);
    }
  }, [open, prefill, defaultCurrency]);

  function press(key: string) {
    setError(null);
    setAmount((prev) => {
      if (key === "del") return prev.slice(0, -1);
      if (key === ".") {
        if (prev.includes(".") || currencyMeta(currency).decimals === 0) return prev;
        return prev === "" ? "0." : `${prev}.`;
      }
      if (prev === "0") return key;
      // Two decimal places is the most any currency here shows.
      if (prev.includes(".") && prev.split(".")[1].length >= 2) return prev;
      return (prev + key).slice(0, 13);
    });
  }

  async function submit() {
    setError(null);
    const value = Number(amount);
    if (!item.trim()) return setError("What did you spend on?");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than zero");

    // A spoken "yesterday" keeps the same clock time, a day back, so the entry
    // lands inside the right local day whatever the timezone.
    const offset = prefill?.day_offset ?? 0;
    const when = new Date();
    if (offset) when.setDate(when.getDate() + offset);

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: item.trim(),
          amount: value,
          currency,
          note,
          category,
          // "unclear" is left off so the classifier still gets a say.
          need_level: need === "unclear" ? undefined : need,
          source,
          spent_at: offset ? when.toISOString() : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save that");

      onAdded((body.expenses ?? [body.expense]) as Expense[], body.statement ?? null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that");
    } finally {
      setSaving(false);
    }
  }

  const meta = currencyMeta(currency);

  return (
    <Sheet open={open} onClose={onClose} label="Add a spend">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Add a spend</h2>
        <div className="flex gap-2">
          {onVoice && (
            <IconButton label="Log by voice" onClick={onVoice} path="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0m7 7v3" />
          )}
          {onScan && (
            <IconButton
              label="Scan a receipt"
              onClick={onScan}
              path="M4 8V6a2 2 0 0 1 2-2h2m8 0h2a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1-2 2h-2m-8 0H6a2 2 0 0 1-2-2v-2M7 12h10"
            />
          )}
        </div>
      </div>

      {/* The amount, shown the size it deserves. */}
      <div className="mt-5 flex items-end justify-center gap-2">
        <span className="pb-1 text-lg font-bold" style={{ color: "var(--muted)" }}>
          {meta.symbol}
        </span>
        <span
          className="num text-5xl"
          style={{ color: amount ? "var(--ink)" : "var(--muted)" }}
          aria-live="polite"
        >
          {amount || "0"}
        </span>
      </div>

      <div className="mt-3 flex justify-center">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-label="Currency"
          className="chip px-3 py-1.5 text-xs font-semibold"
          style={{ border: "1px solid var(--line)" }}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
      </div>

      <input
        ref={itemRef}
        value={item}
        onChange={(e) => setItem(e.target.value)}
        placeholder="Chai, petrol, groceries…"
        maxLength={200}
        className="mt-4 w-full rounded-2xl px-4 py-3.5 text-base outline-none"
        style={{ background: "var(--field)", color: "var(--ink)" }}
      />

      {/* Needs and wants, named exactly that. Neither is styled as the right
          answer — the toggle just records which one it was. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            ["need", "Need"],
            ["want", "Want"],
            ["unclear", "Not sure"],
          ] as [NeedLevel, string][]
        ).map(([value, label]) => {
          const active = need === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setNeed(value)}
              aria-pressed={active}
              className="rounded-2xl py-2.5 text-sm font-semibold"
              style={{
                background: active ? "var(--ink)" : "var(--field)",
                color: active ? "var(--card)" : "var(--ink-2)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        maxLength={280}
        className="mt-3 w-full rounded-2xl px-4 py-2.5 text-sm outline-none"
        style={{ background: "var(--field)", color: "var(--ink)" }}
      />

      {error && (
        <p className="mt-3 text-sm font-medium" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) => {
          // PKR is counted in whole rupees, so the decimal key has nothing to
          // do — it stays in place to keep the grid steady, but reads as off.
          const dead = key === "." && meta.decimals === 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={dead}
              aria-label={key === "del" ? "Delete last digit" : key}
              aria-hidden={dead || undefined}
              className="rounded-2xl py-3.5 text-xl font-bold active:opacity-70"
              style={{
                background: "var(--field)",
                color: "var(--ink)",
                opacity: dead ? 0.35 : 1,
              }}
            >
              {key === "del" ? "⌫" : key}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="btn-lime mt-3 w-full py-4 text-base"
      >
        {saving ? "Saving…" : "Save spend"}
      </button>
    </Sheet>
  );
}

function IconButton({
  label,
  onClick,
  path,
}: {
  label: string;
  onClick: () => void;
  path: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center rounded-full"
      style={{ background: "var(--field)", color: "var(--ink)" }}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={path} />
      </svg>
    </button>
  );
}
