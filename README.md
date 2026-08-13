# Paisa

A personal expense tracker built as an installable PWA. Log every purchase in two
taps, see where the money went in graphs, and get an honest daily, weekly and
monthly read on it.

- **Google sign-in** — Supabase Auth, nothing else to remember.
- **Two-tap logging** — a `+` button bottom-right, an item, an amount. PKR by
  default, nine currencies available; everything is normalised to your base
  currency at the rate that applied when you entered it.
- **Chart-first reports** — daily, weekly and monthly. Needs-vs-wants split,
  day-by-day bars, top categories, a trend line. One headline, one verdict and
  at most three tips of prose; the rest is graphs.
- **A money coach** — chat that only discusses your finances and declines
  everything else.
- **Nudges** — a push notification if nothing has been logged for 90 minutes,
  inside waking hours you choose. Weekly report Sunday 8 AM, monthly on the 1st.

Claude classifies each purchase as a need or a want, writes the period summaries,
and answers in the coach. You can correct any classification by tapping its badge.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   It creates the tables, row-level security policies, and the trigger that makes
   a profile row on signup. It is safe to re-run.
3. **Authentication → Sign In / Providers → Google** → enable it, and paste in a
   Google OAuth client ID and secret (create one in the
   [Google Cloud console](https://console.cloud.google.com/apis/credentials) as an
   *OAuth client ID → Web application*).
   - In Google Cloud, set the **Authorised redirect URI** to the callback URL that
     Supabase shows on that same page — it looks like
     `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
4. **Authentication → URL Configuration** → set **Site URL** to your app's URL and
   add `http://localhost:3000/**` plus `https://your-app.vercel.app/**` to
   **Redirect URLs**.
5. Copy the project URL and both API keys from **Project Settings → API Keys**.

### 3. Push notification keys

```bash
npx web-push generate-vapid-keys
```

Keep the public key for `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private one for
`VAPID_PRIVATE_KEY`.

### 4. Environment

```bash
cp .env.example .env.local
```

Fill in every value. `CRON_SECRET` can be anything long and random
(`openssl rand -hex 32`).

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

> Push notifications need HTTPS. They work on `localhost` for testing and on any
> deployed HTTPS origin, but not on a plain-HTTP LAN address.

---

## Deploying

Deploy to Vercel, set the same environment variables in the project settings, and
the two cron jobs in `vercel.json` register automatically:

| Job | Schedule | What it does |
|---|---|---|
| `/api/cron/reminders` | every 15 min | Nudges anyone who has logged nothing for 90 minutes, inside their own waking hours |
| `/api/cron/reports` | hourly | Generates and pushes whichever report is due in each user's timezone |

Both endpoints require `Authorization: Bearer $CRON_SECRET`, which Vercel Cron
sends automatically.

**On Vercel's Hobby plan cron jobs run at most once per day**, so the 90-minute
nudge needs an external scheduler. Point any of these at the same URLs on the
schedules above, with the secret as a query parameter
(`?secret=$CRON_SECRET`) if the service cannot set headers:

- [cron-job.org](https://cron-job.org) — free, supports custom headers
- GitHub Actions on a `schedule` trigger
- Supabase `pg_cron` + `pg_net`

### Installing it on your phone

Open the deployed URL in Chrome (Android) or Safari (iOS) and choose **Add to
Home Screen**. On iOS, notifications only work once the app has been added to the
home screen — that is an Apple restriction, not an app one.

---

## How it fits together

```
src/
  app/
    (app)/            Today, Reports, Coach, Settings — the signed-in shell
    api/
      expenses/       CRUD; POST classifies in the background so saving stays instant
      insights/       Period stats + the cached AI summary
      chat/           Streaming, finance-only coach
      push/subscribe  Device registration for web push
      cron/           reminders (every 15 min) and reports (hourly)
    auth/             OAuth callback and sign-out
    login/
  components/         Charts (hand-rolled SVG), screens, the add-expense sheet
  lib/
    periods.ts        Timezone-aware day/week/month maths, Intl only
    stats.ts          Raw rows -> the shape charts and the model both consume
    reports.ts        Builds a report, reusing the cached summary when nothing changed
    anthropic.ts      Classification, period summaries, the coach's system prompt
    rates.ts          Live FX with a static fallback
    push.ts           web-push delivery, prunes dead subscriptions
supabase/schema.sql   Tables, RLS policies, signup trigger
scripts/              PWA icon generator (no image dependencies)
```

**Money handling.** Each expense stores the amount as entered, its currency, the
rate used, and the converted `base_amount`. Historical totals never shift when
exchange rates move. Rates come from a free public endpoint with a static table as
a fallback, so a network failure can never block a save.

**Periods.** Weeks run Sunday–Saturday so the Sunday-morning report always covers
a week that has finished. Months are calendar months. Everything is computed in
the user's own timezone and translated to UTC for the query.

**Charts.** Hand-rolled SVG — two series (blue = needs, orange = wants) validated
for colour-vision deficiency in both light and dark mode, with a legend, direct
labels, hover tooltips and a table view so nothing depends on colour alone.

---

## Costs

Claude is called on three paths: once per expense to classify it (small), once per
period summary (cached until an expense in that period changes), and per coach
message. Supabase and Vercel both have free tiers that comfortably cover personal
use. Set `ANTHROPIC_MODEL` if you want a different model.
