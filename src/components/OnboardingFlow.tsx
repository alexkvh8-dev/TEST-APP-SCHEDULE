"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { COUNTRIES, countryByCode, guessCountry } from "@/lib/countries";
import { currencyMeta, formatMoney } from "@/lib/currency";
import type { PrimaryGoal, Profile } from "@/lib/types";

/*
 * One question per screen.
 *
 * The rule throughout: every question must change something the app does. Name
 * changes the greeting, country sets currency and timezone, income sizes the
 * suggested budget, goal picks the copy. A question that only fills a database
 * column is a question that should not be asked.
 *
 * Everything except the country can be skipped, and nothing here is asked
 * again — it all lives in Settings afterwards.
 */

const GOALS: { value: PrimaryGoal; label: string; hint: string }[] = [
  { value: "awareness", label: "Know where it goes", hint: "Most people start here" },
  { value: "save", label: "Save more each month", hint: "Build a cushion" },
  { value: "budget", label: "Stick to a budget", hint: "Stop overshooting" },
  { value: "debt", label: "Pay something off", hint: "Loan, card, or a person" },
];

/** A budget people can actually hold: 75% of income, rounded to something human. */
function suggestBudget(income: number): number {
  const target = income * 0.75;
  const step = target > 100_000 ? 5_000 : target > 10_000 ? 1_000 : 100;
  return Math.max(step, Math.round(target / step) * step);
}

type StepId = "welcome" | "name" | "country" | "income" | "budget" | "goal" | "done";

const ORDER: StepId[] = ["welcome", "name", "country", "income", "budget", "goal", "done"];

export function OnboardingFlow({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("welcome");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return profile.timezone;
    }
  }, [profile.timezone]);

  const [name, setName] = useState(profile.full_name ?? "");
  const [country, setCountry] = useState(
    profile.country ?? guessCountry(browserTz)?.code ?? "PK",
  );
  const [income, setIncome] = useState(
    profile.monthly_income != null ? String(profile.monthly_income) : "",
  );
  const [budget, setBudget] = useState(
    profile.monthly_budget != null ? String(profile.monthly_budget) : "",
  );
  const [goal, setGoal] = useState<PrimaryGoal>("awareness");

  const selected = countryByCode(country);
  const currency = selected?.currency ?? profile.base_currency;
  const index = ORDER.indexOf(step);
  const progress = (index / (ORDER.length - 1)) * 100;

  function go(next: StepId) {
    setError(null);
    setStep(next);
  }

  function toIncomeStep() {
    // Moving off the country step is what fixes the currency, so the income
    // question can show the right symbol.
    go("income");
  }

  function toBudgetStep() {
    const value = Number(income);
    if (income.trim() && Number.isFinite(value) && value > 0 && !budget) {
      setBudget(String(suggestBudget(value)));
    }
    go("budget");
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim() || null,
          country,
          base_currency: currency,
          timezone: selected?.timezone ?? browserTz,
          monthly_income: income.trim() ? Number(income) : null,
          monthly_budget: budget.trim() ? Number(budget) : null,
          primary_goal: goal,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save that");

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pb-8 pt-6">
      <div className="flex items-center gap-3">
        {index > 0 && step !== "done" && (
          <button
            type="button"
            onClick={() => go(ORDER[index - 1])}
            aria-label="Back"
            className="shrink-0"
            style={{ color: "var(--muted)" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5m6-7-7 7 7 7" />
            </svg>
          </button>
        )}
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full"
          style={{ background: "var(--field)" }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Setup progress"
        >
          <div
            className="h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(progress, 4)}%`, background: "var(--lime)" }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        {step === "welcome" && (
          <Step
            key="welcome"
            title="A few quick questions before your first entry"
            body="Six of them. They set your currency, your budget and how the app talks to you — then you never see them again."
          />
        )}

        {step === "name" && (
          <Step key="name" title="What should we call you?" body="It only shows up in your own greeting.">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              autoFocus
              className="w-full rounded-2xl px-4 py-4 text-base outline-none"
              style={{ background: "var(--field)", color: "var(--ink)" }}
            />
          </Step>
        )}

        {step === "country" && (
          <Step
            key="country"
            title="Where are you?"
            body="This sets your currency and when your day rolls over. Both are editable later."
          >
            <div className="flex flex-col gap-2">
              {COUNTRIES.map((c) => (
                <Choice
                  key={c.code}
                  active={country === c.code}
                  onClick={() => setCountry(c.code)}
                  label={`${c.flag}  ${c.name}`}
                  hint={c.currency}
                />
              ))}
            </div>
          </Step>
        )}

        {step === "income" && (
          <Step
            key="income"
            title="Roughly what comes in each month?"
            body="Used to suggest a budget you can actually hold. Skip it if you would rather not say — nothing else depends on it."
          >
            <AmountField
              value={income}
              onChange={setIncome}
              currency={currency}
              label="Monthly income"
            />
          </Step>
        )}

        {step === "budget" && (
          <Step
            key="budget"
            title="What is your monthly spending limit?"
            body={
              income.trim() && Number(income) > 0
                ? `We suggested ${formatMoney(suggestBudget(Number(income)), currency)} — about three quarters of what comes in. Change it to whatever is realistic.`
                : "This is the number your daily safe-to-spend is divided out of."
            }
          >
            <AmountField
              value={budget}
              onChange={setBudget}
              currency={currency}
              label="Monthly budget"
            />
          </Step>
        )}

        {step === "goal" && (
          <Step key="goal" title="What are you here to do?" body="It changes what the app points out to you.">
            <div className="flex flex-col gap-2">
              {GOALS.map((g) => (
                <Choice
                  key={g.value}
                  active={goal === g.value}
                  onClick={() => setGoal(g.value)}
                  label={g.label}
                  hint={g.hint}
                />
              ))}
            </div>
          </Step>
        )}

        {step === "done" && (
          <Step
            key="done"
            title={name.trim() ? `You're set, ${name.trim().split(" ")[0]}.` : "You're set."}
            body={
              budget.trim() && Number(budget) > 0
                ? `Everything is counted in ${currencyMeta(currency).name}. Your first safe-to-spend figure is waiting on the home screen — log one thing today and the streak starts.`
                : `Everything is counted in ${currencyMeta(currency).name}. Log one thing today and the streak starts. You can set a budget any time from the Budget tab.`
            }
          />
        )}
      </div>

      {error && (
        <p className="mb-3 text-center text-sm font-medium" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (step === "welcome") go("name");
            else if (step === "name") go("country");
            else if (step === "country") toIncomeStep();
            else if (step === "income") toBudgetStep();
            else if (step === "budget") go("goal");
            else if (step === "goal") go("done");
            else finish();
          }}
          className="btn-lime w-full py-4 text-base"
        >
          {saving
            ? "Setting up…"
            : step === "welcome"
              ? "Let's go"
              : step === "done"
                ? "Start tracking"
                : "Continue"}
        </button>

        {/* Skippable steps say so plainly rather than hiding behind a small "x". */}
        {(step === "name" || step === "income" || step === "budget") && (
          <button
            type="button"
            onClick={() => {
              if (step === "name") go("country");
              else if (step === "income") toBudgetStep();
              else go("goal");
            }}
            className="w-full py-3 text-sm font-semibold"
            style={{ color: "var(--muted)" }}
          >
            Skip this
          </button>
        )}
      </div>
    </main>
  );
}

function Step({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rise">
      <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2.5 text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
        {body}
      </p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

function Choice({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition-colors"
      style={{
        background: active ? "var(--lime)" : "var(--card)",
        color: active ? "var(--lime-ink)" : "var(--ink)",
        boxShadow: active ? "none" : "var(--shadow)",
      }}
    >
      <span>{label}</span>
      <span
        className="shrink-0 text-xs font-semibold"
        style={{ color: active ? "var(--lime-ink)" : "var(--muted)", opacity: active ? 0.7 : 1 }}
      >
        {hint}
      </span>
    </button>
  );
}

function AmountField({
  value,
  onChange,
  currency,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  currency: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-4" style={{ background: "var(--field)" }}>
      <span className="text-lg font-bold" style={{ color: "var(--muted)" }}>
        {currencyMeta(currency).symbol}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        inputMode="decimal"
        autoFocus
        aria-label={label}
        placeholder="0"
        className="num min-w-0 flex-1 bg-transparent text-3xl outline-none"
        style={{ color: "var(--ink)" }}
      />
    </div>
  );
}
