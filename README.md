# FinX

A personal expense tracker built as an installable PWA. Log every purchase in two
taps, see where the money went in graphs, and get an honest daily, weekly and
monthly read on it.

**It runs on free tiers end to end.** Nothing here needs a paid plan, and nothing
needs a credit card.

> **Just want it on your phone?** [**INSTALL.md**](INSTALL.md) is a click-by-click
> walkthrough — deploy it free, then install it on Android, iPhone and desktop.
> No terminal required.
>
> **Worried about your users' data?** [**SECURITY.md**](SECURITY.md) lists what
> protects it and how to verify each claim yourself.

- **Email + password sign-in** — your data lives in the cloud against your email.
  Sign in on a phone, a laptop, anything, and everything is there.
- **Two-tap logging** — a numpad sheet off the `+` button, an item, an amount.
  PKR by default, nine currencies available; everything is normalised to your
  base currency at the rate that applied when you entered it. Saving shows one
  true statement about the spend — never praise, never a telling-off.
- **Safe-to-spend** — the home screen leads with what is genuinely free to spend
  today: the rest of the monthly budget, spread over the days that remain. With
  no budget set it asks for one instead of inventing a number.
- **Log by voice** — say "three hundred on chai". Speech-to-text happens in the
  browser, so only the words travel; the parsed result opens the normal add
  sheet for review before it is saved.
- **Receipt split-scanning** — one photo becomes one entry per line, not a
  single lump sum. Every line is editable and individually droppable.
- **Streaks** — consecutive days *logged*, not days under budget: rewarding a
  cheap day would make writing down the expensive one cost you something. Today
  stays open until it ends, so an unlogged morning never breaks a live run.
- **Budget envelopes** — a per-category limit with a bar and a remainder, plus
  the monthly figure that drives safe-to-spend.
- **Chart-first reports** — daily, weekly and monthly. Needs-vs-wants split,
  day-by-day bars, top categories, a trend line. One headline, one verdict and
  at most three tips of prose; the rest is graphs.
- **A money coach** — chat that only discusses your finances and declines
  everything else.
- **Nudges** — a push notification after a stretch of no logging that you choose
  (four hours by default, two to twelve), inside waking hours you choose. Weekly
  report Sunday 8 AM, monthly on the 1st.
- **Light and dark** — a designed dark set, not an inversion, chosen per device.

---

## What each piece costs

| Piece | Service | Cost | Runs out when |
|---|---|---|---|
| Database + login | Supabase free tier | Free | 500 MB of data, or 50,000 monthly users |
| Hosting | Vercel Hobby | Free | You start charging for the app — Hobby is non-commercial, see below |
| Scheduled jobs | GitHub Actions | Free | 2,000 minutes/month on a private repo; unlimited if public |
| Push notifications | Web Push (VAPID) | Free | Never — your own server sends them, there is no service in between |
| Need/want sorting, summaries, coach | Google Gemini free tier | Free | Roughly 10 requests a minute; the app falls back to its own rules instead of failing |
| Email to other people | Resend / Brevo | Free | 3,000/month (Resend) or 300/day (Brevo) |
| **A domain** | Porkbun, Cloudflare, Vercel | **$1–10/year** | The only recurring cost, and only needed for email |
| *(optional)* better summaries | Anthropic Claude | **Paid** | Skip it unless you want it — Gemini is free and good |

**Two caveats worth knowing before you invite anyone:**

- **Vercel's Hobby plan is for non-commercial use.** Running FinX for yourself
  and friends is fine. The moment you charge for it, run ads, or use it for a
  business, their terms require **Pro at $20/month**. Nothing breaks
  technically — it is a licensing line, and worth knowing before you build a
  business on it.
- **Supabase pauses free projects after 7 days with no activity.** The cron
  workflow in this repo pings it every 15 minutes, so in practice this never
  happens to you. Worth remembering if you ever switch the scheduler off.

**If you add no AI key at all, the app still works.** Need/want sorting falls back
to a built-in keyword engine, summaries are generated from your actual numbers,
and the coach answers common questions ("where is my money going", "how can I
save") straight from your data. Adding a free Gemini key upgrades all three.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase (free)

1. Create a project at [supabase.com](https://supabase.com) — no card required.
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   It creates the tables, row-level security policies, and the trigger that makes
   a profile row on signup. It is safe to re-run.
3. **New query** again → paste all of `supabase/migration-002-features.sql` →
   **Run**. It adds the reminder spacing setting, the `category_budgets` table,
   and the `group_id`/`source` columns behind voice logging and receipt
   scanning. Also safe to re-run.
4. **New query** once more → paste `supabase/migration-003-onboarding.sql` →
   **Run**. It adds the country, income and goal the welcome flow collects.
5. **Authentication → Sign In / Providers → Email** — make sure it is enabled.
   Leave **Confirm email off** until you have real email sending configured;
   the built-in mailer sends about two messages an hour, so other people's
   confirmations would silently fail. Account security does not depend on it —
   see [SECURITY.md](SECURITY.md).

   > Supabase's built-in mailer is development-only: roughly **2 emails an
   > hour**, to your own address. Fine for your devices, useless the moment
   > someone else signs up. Before you share the app, connect real SMTP —
   > Resend is free for 3,000/month and needs a domain so Gmail and Yahoo will
   > accept the mail. See
   > [INSTALL.md](INSTALL.md#sending-real-email-to-other-people).
6. **Authentication → URL Configuration** → set **Site URL** to your app's URL
   and add `http://localhost:3000/**` plus `https://your-app.vercel.app/**` to
   **Redirect URLs**.
7. Copy the project URL and both API keys from **Project Settings → API Keys**.

> There is no Google Cloud console step and no OAuth client to create. You sign
> up with an email and a password, and that account is what syncs your data
> across devices.

### 3. Gemini API key (free, optional but recommended)

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in
with any Google account, and click **Create API key**. No billing setup, no card.
Paste it into `GEMINI_API_KEY`.

The free tier allows roughly 10 requests a minute. FinX uses one request per
expense you log, one per report, and one per coach message — comfortably inside
that for personal use. If you do hit the limit, the app quietly falls back to the
built-in rules instead of failing.

### 4. Push notification keys (free)

```bash
npx web-push generate-vapid-keys
```

Public key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private key → `VAPID_PRIVATE_KEY`.

### 5. Environment

```bash
cp .env.example .env.local
```

Fill it in. `CRON_SECRET` can be anything long and random (`openssl rand -hex 32`).

### 6. Run

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, and start logging.

> Push notifications need HTTPS. They work on `localhost` for testing and on any
> deployed HTTPS origin, but not on a plain-HTTP LAN address.

---

## Deploying (free)

### Hosting

Push the repo to GitHub, import it at [vercel.com](https://vercel.com) on the
**Hobby** plan, and paste the same environment variables into the project
settings. That is the whole deploy.

### Scheduled jobs

Vercel's Hobby plan only runs cron **once a day**, which cannot drive a
few-hourly nudge — so this repo schedules the jobs from **GitHub Actions** instead, which is
free. `.github/workflows/cron.yml` is already committed. Set two things once:

**Repo → Settings → Secrets and variables → Actions**

| Kind | Name | Value |
|---|---|---|
| Variable | `APP_URL` | `https://your-app.vercel.app` (no trailing slash) |
| Secret | `CRON_SECRET` | the same string as in your Vercel env vars |

Then open the **Actions** tab and run **Scheduled jobs** once by hand to confirm
both endpoints answer `200`.

| Job | Runs | What it does |
|---|---|---|
| Inactivity nudge | every 15 min | Nudges you after your chosen quiet stretch (4 hours by default), inside your waking hours |
| Scheduled reports | hourly | Generates and pushes whichever report is due in your timezone |

Two GitHub quirks worth knowing, both harmless here:

- Scheduled runs land on shared runners and can be a few minutes late. Both
  endpoints re-check the real state, so calling them late or twice changes nothing.
- GitHub disables scheduled workflows after **60 days with no commits**. Push
  anything, or hit **Run workflow**, to re-arm. If you would rather not think
  about it, [cron-job.org](https://cron-job.org) is also free, has neither quirk,
  and can call the same two URLs — it supports custom headers, or you can pass
  `?secret=YOUR_CRON_SECRET` on the URL instead.

*(On Vercel Pro you can delete the workflow and add `crons` back to `vercel.json`.)*

### Installing it on your phone

Open the deployed URL in Chrome (Android) or Safari (iOS) and choose **Add to
Home Screen**. On iOS, notifications only work once the app has been added to the
home screen — that is an Apple restriction, not an app one.

> Supabase pauses free projects after 7 days with **no activity at all**. Using
> the app, or the cron jobs hitting it, is enough to keep it awake.

---

## How it fits together

```
src/
  app/
    (app)/            Today, Reports, Coach, Settings — the signed-in shell
    api/
      expenses/       CRUD; POST classifies in the background so saving stays instant
      insights/       Period stats + the cached summary
      chat/           Streaming, finance-only coach
      push/subscribe  Device registration for web push
      cron/           reminders (every 15 min) and reports (hourly)
    auth/             Email confirmation / reset callback, sign-out
    login/
  components/         Charts (hand-rolled SVG), screens, the add-expense sheet
  lib/
    ai/
      index.ts        Provider selection + fallback to rules on any failure
      gemini.ts       Free tier, plain REST, no SDK
      anthropic.ts    Optional, paid
      heuristics.ts   The zero-key engine: keyword classifier, rules summary, rules coach
      prompts.ts      Prompts shared by both providers
    dashboard.ts      Streak, safe-to-spend, repeat chips, the post-save statement
    periods.ts        Timezone-aware day/week/month maths, Intl only
    stats.ts          Raw rows -> the shape charts and the model both consume
    reports.ts        Builds a report, reusing the cached summary when nothing changed
    rates.ts          Live FX with a static fallback
    push.ts           web-push delivery, prunes dead subscriptions
supabase/schema.sql   Tables, RLS policies, signup trigger
supabase/migration-002-features.sql
                      Reminder spacing, category budgets, voice/receipt columns
supabase/migration-003-onboarding.sql
                      Country, income, goal, onboarded_at
.github/workflows/    Free scheduler for the cron jobs
```

**Provider selection.** `GEMINI_API_KEY` set → Gemini. Otherwise `ANTHROPIC_API_KEY`
set → Claude. Otherwise the rules engine. Force one with `AI_PROVIDER=gemini`,
`anthropic` or `rules`. Whichever is active is shown in Settings. Every AI call
falls back to the rules engine if it fails, so a rate limit or an outage can never
lose an expense or break a report.

**Your data.** Everything is keyed to your Supabase user id, and row-level
security means the database itself rejects any query for someone else's rows —
not just the app. Signing in on a new device fetches it all.

**Money handling.** Each expense stores the amount as entered, its currency, the
rate used, and the converted `base_amount`. Historical totals never shift when
exchange rates move.

**Periods.** Weeks run Sunday–Saturday so the Sunday-morning report always covers
a week that has finished. Everything is computed in your timezone and translated
to UTC for the query.

**Charts.** Hand-rolled SVG — two series (blue = needs, orange = wants) validated
for colour-vision deficiency in both light and dark mode, with a legend, direct
labels, hover tooltips and a table view so nothing depends on colour alone.
