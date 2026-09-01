"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTheme, type ThemeChoice } from "@/components/useTheme";
import { CURRENCIES } from "@/lib/currency";
import type { Profile } from "@/lib/types";

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`,
}));

/** Three and four hours are the sane middle; the rest are there for edge cases. */
const INTERVALS = [2, 3, 4, 6, 8, 12];

/** VAPID keys travel as base64url; the Push API wants a Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/*
 * The label wraps onto its own line rather than compressing when the control
 * beside it is wide — an hour range needs two selects, and squeezing "Only
 * between" into one word per line is worse than a taller row.
 */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-40 flex-1">
        <div className="text-sm font-semibold">{label}</div>
        {hint && (
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {hint}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const selectStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
} as const;

export function SettingsScreen({
  profile: initial,
  aiProvider,
}: {
  profile: Profile;
  aiProvider: string;
}) {
  const [profile, setProfile] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"unknown" | "on" | "off" | "unsupported">("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const { theme, choose } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushState(sub ? "on" : "off"))
      .catch(() => setPushState("off"));
  }, []);

  async function save(patch: Partial<Profile>) {
    setProfile((prev) => ({ ...prev, ...patch }));
    setStatus(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      const body = await res.json();
      setProfile(body.profile);
      setStatus("Saved");
      setTimeout(() => setStatus(null), 1500);
    } else {
      const body = await res.json().catch(() => ({}));
      setStatus(body.error ?? "Could not save");
      setProfile(initial);
    }
  }

  async function enablePush() {
    setPushBusy(true);
    setStatus(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Notifications are blocked in your browser settings.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setStatus("Push keys are not configured on the server.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not register this device");
      }

      setPushState("on");
      setStatus("Reminders on for this device");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not enable notifications");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushState("off");
      setStatus("Reminders off for this device");
    } finally {
      setPushBusy(false);
    }
  }

  const card = { background: "var(--card)", borderRadius: 22, boxShadow: "var(--shadow)" } as const;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        {status && (
          <span className="text-xs font-semibold" style={{ color: "var(--ink-2)" }} role="status">
            {status}
          </span>
        )}
      </header>

      {/* Appearance is a per-device choice, so it never touches the profile. */}
      <section className="px-4" style={card}>
        <Row label="Appearance" hint="Follows your phone unless you pick one">
          <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--field)" }}>
            {(
              [
                ["system", "Auto"],
                ["light", "Light"],
                ["dark", "Dark"],
              ] as [ThemeChoice, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => choose(value)}
                aria-pressed={theme === value}
                className="rounded-full px-3 py-1.5 text-xs font-bold"
                style={{
                  background: theme === value ? "var(--card)" : "transparent",
                  color: theme === value ? "var(--ink)" : "var(--muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="px-4" style={card}>
        <Row label="Currency" hint="Everything is totalled in this currency">
          <select
            value={profile.base_currency}
            onChange={(e) => save({ base_currency: e.target.value })}
            className="rounded-lg px-3 py-2 text-sm"
            style={selectStyle}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </Row>

        <div style={{ borderTop: "1px solid var(--grid)" }} />

        <Row label="Monthly budget" hint="Optional. Leave blank for none.">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            defaultValue={profile.monthly_budget ?? ""}
            onBlur={(e) =>
              save({
                monthly_budget: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="—"
            className="tabular w-28 rounded-lg px-3 py-2 text-right text-sm"
            style={selectStyle}
          />
        </Row>

        <div style={{ borderTop: "1px solid var(--grid)" }} />

        <Row label="Timezone" hint="Decides when your day, week and month roll over">
          <input
            defaultValue={profile.timezone}
            onBlur={(e) => save({ timezone: e.target.value.trim() })}
            className="w-44 rounded-lg px-3 py-2 text-sm"
            style={selectStyle}
          />
        </Row>
      </section>

      <h2 className="mt-1 text-sm font-semibold">Reminders</h2>

      <section className="px-4" style={card}>
        <Row
          label="Notifications on this device"
          hint={
            pushState === "unsupported"
              ? "Not supported by this browser"
              : pushState === "on"
                ? "This device will receive nudges and reports"
                : "Install the app or allow notifications to turn on"
          }
        >
          <button
            type="button"
            disabled={pushBusy || pushState === "unsupported"}
            onClick={pushState === "on" ? disablePush : enablePush}
            className={
              pushState === "on"
                ? "btn-quiet px-4 py-2 text-sm disabled:opacity-50"
                : "btn-lime px-4 py-2 text-sm"
            }
          >
            {pushBusy ? "…" : pushState === "on" ? "Turn off" : "Turn on"}
          </button>
        </Row>

        <div style={{ borderTop: "1px solid var(--line)" }} />

        <Row
          label="Nudge me if I stop logging"
          hint={`Fires after ${profile.reminder_interval_hours ?? 4} quiet hours`}
        >
          <input
            type="checkbox"
            checked={profile.reminders_enabled}
            onChange={(e) => save({ reminders_enabled: e.target.checked })}
            className="size-5"
            style={{ accentColor: "var(--ink)" }}
            aria-label="Inactivity nudges"
          />
        </Row>

        <div style={{ borderTop: "1px solid var(--line)" }} />

        <Row label="How often at most" hint="A nudge you resent is a nudge that gets the app deleted">
          <select
            value={profile.reminder_interval_hours ?? 4}
            onChange={(e) => save({ reminder_interval_hours: Number(e.target.value) })}
            className="rounded-lg px-3 py-2 text-sm"
            style={selectStyle}
            aria-label="Hours between nudges"
          >
            {INTERVALS.map((hours) => (
              <option key={hours} value={hours}>
                Every {hours} hours
              </option>
            ))}
          </select>
        </Row>

        <div style={{ borderTop: "1px solid var(--line)" }} />

        <Row label="Only between" hint="Nudges stay inside these hours">
          <div className="flex items-center gap-2">
            <select
              value={profile.reminder_start_hour}
              onChange={(e) => save({ reminder_start_hour: Number(e.target.value) })}
              className="rounded-lg px-2 py-2 text-sm"
              style={selectStyle}
              aria-label="Reminder start hour"
            >
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              and
            </span>
            <select
              value={profile.reminder_end_hour}
              onChange={(e) => save({ reminder_end_hour: Number(e.target.value) })}
              className="rounded-lg px-2 py-2 text-sm"
              style={selectStyle}
              aria-label="Reminder end hour"
            >
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </Row>

        <div style={{ borderTop: "1px solid var(--grid)" }} />

        <Row label="Daily summary at" hint="Weekly lands Sunday 8 AM, monthly on the 1st">
          <select
            value={profile.daily_summary_hour}
            onChange={(e) => save({ daily_summary_hour: Number(e.target.value) })}
            className="rounded-lg px-2 py-2 text-sm"
            style={selectStyle}
          >
            {HOURS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </Row>
      </section>

      <h2 className="mt-1 text-sm font-semibold">Account</h2>

      <section className="px-4" style={card}>
        <Row
          label={profile.email ?? "Signed in"}
          hint="Sign in with this email on any device to see all your data"
        >
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--critical)" }}
            >
              Sign out
            </button>
          </form>
        </Row>

        <div style={{ borderTop: "1px solid var(--grid)" }} />

        <Row label="Password" hint="Change the password for this account">
          <Link
            href="/reset-password"
            className="inline-block rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
          >
            Change
          </Link>
        </Row>

        <div style={{ borderTop: "1px solid var(--grid)" }} />

        <Row label="Summaries written by" hint={aiProvider}>
          <span />
        </Row>
      </section>
    </div>
  );
}
