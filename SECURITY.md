# Security

Written so you can check these claims rather than trust them. Every item says
where it lives in the code.

---

## The short version

**Email delivery and account security are two different things.**

A paid domain buys *deliverability* — whether a confirmation email lands in the
inbox or the spam folder. It buys nothing security-wise. Everything below
protects your users' money data, costs nothing, and is already deployed.

---

## What protects your users right now

### 1. One user cannot read another user's data. Ever.

Every table has Row Level Security switched on, with a policy that compares the
row's owner to the signed-in user id — enforced by Postgres itself, not by
application code:

```sql
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`supabase/schema.sql`, five tables: profiles, expenses, insights, chat_messages,
push_subscriptions.

This matters more than it sounds. Even if someone got hold of the public API key
that ships in the browser — it is *designed* to be public — they still could not
read a single row belonging to anybody else. The database refuses. There is no
app-level check to forget or bypass.

### 2. Passwords are never stored, and never seen by this app

Supabase Auth hashes them with bcrypt on their side. This codebase never
receives, logs, or stores a password. Search it: `signInWithPassword` hands the
value straight to Supabase and keeps nothing.

Requirements when choosing one (`src/lib/password.ts`): 10 characters minimum,
upper, lower, digit, symbol, blocked against a list of common passwords and
against the user's own email address.

### 3. Server secrets never reach the browser

The `service_role` key bypasses RLS entirely, so it exists only in server-only
files — `src/lib/supabase/admin.ts`, used exclusively by the two cron routes.
The Gemini key is the same.

Verified against the actual built bundle, not just by reading the source:

```bash
npm run build
grep -roE "sb_secret_[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{30,}" .next/static/
```

No matches. Re-run it any time you change something.

### 4. The session cannot be stolen by a script on the page

`next.config.mjs` sets a Content Security Policy that restricts `connect-src` to
Supabase and the two exchange-rate endpoints. Even if an attacker managed to run
JavaScript on the page, it could not post your data to their own server — the
browser blocks the request.

Alongside it: `frame-ancestors 'none'` and `X-Frame-Options: DENY` (nobody can
frame the app and trick users into clicking through it), `Referrer-Policy`,
`Permissions-Policy`, and HSTS.

### 5. Sign-in cannot be used to send users somewhere else

`?next=` used to accept `//evil.com`, which browsers read as another website —
so a crafted link could sign someone in and hand them straight to an attacker's
page. `src/lib/redirect.ts` now rejects anything that is not a plain in-app
path, including backslashes and control characters.

### 6. The scheduled-job endpoints cannot be brute-forced

They are public URLs guarded by a shared secret, compared in constant time
(`src/lib/cron.ts`) so the time a wrong guess takes reveals nothing about how
much of it was right.

### 7. Nobody can discover who has an account here

"Forgot your password" returns the same sentence whether or not the address
exists (`src/components/AuthForm.tsx`). Otherwise the form doubles as a way to
test which of your users' emails are registered.

### 8. One account cannot burn your bill or your quota

Per-user rate limits on the endpoints that cost money — receipts, voice
parsing, the coach (`src/lib/ratelimit.ts`).

---

## What email confirmation actually adds

Only this: it stops somebody creating an account using **an email address they
do not own**.

That is worth having, but note what it does *not* do. It does not protect
existing accounts, it does not encrypt anything, and it does not stop anybody
reading anybody else's data — items 1 through 8 do that, and they work whether
confirmation is on or off.

### So: turn it off for now

**Authentication → Sign In / Providers → Email → Confirm email → off.**

Signup becomes instant, no email is sent, and nothing above weakens. This is a
perfectly reasonable place to launch from with a small number of users.

The one real consequence: **"Forgot password" needs email to work.** On the
built-in mailer it will fail past a couple of attempts an hour. Until you have
sending set up, reset a password yourself in **Authentication → Users → … →
Send recovery** or by setting one directly. At a handful of users that is a
message and two clicks.

---

## When you can spend a little, in priority order

1. **A domain — around $1–3/year** for a `.xyz` on Porkbun or Namecheap, or
   ~$10 for a `.com` at cost from Cloudflare. This is the only thing standing
   between you and working email for real users, because Gmail and Yahoo have
   required SPF and DKIM authentication since February 2024, and those are DNS
   records.

2. **Free sending on top of it** — Resend gives 3,000 emails a month free,
   Brevo 300 a day. See [INSTALL.md](INSTALL.md#sending-real-email-to-other-people).

### A genuinely free domain, if that is still out of reach

These give you a subdomain where you control DNS records, which is all SPF and
DKIM need:

- **[is-a.dev](https://github.com/is-a-dev/register)** — free `yourname.is-a.dev`
  via a pull request. Supports `TXT` and `MX`. Usually merged within days.
- **[eu.org](https://nic.eu.org)** — free `yourname.eu.org`, running since 1996,
  full DNS control. Approval can take a couple of weeks.

Deliverability from these is decent once SPF and DKIM pass, though not as good
as a domain of your own. It is a real path, not a workaround.

---

## What is still worth doing when you have users

- **Raise or lower Supabase's auth rate limits** under
  **Authentication → Rate Limits** — the sign-in attempt limit is your
  brute-force protection and the defaults are tuned for the built-in mailer.
- **Turn on leaked-password protection** under **Authentication → Policies**,
  if your project offers it. Supabase checks new passwords against Have I Been
  Pwned. Free.
- **Never paste the `service_role` key anywhere but Vercel's environment
  variables.** It bypasses every policy in item 1.
- **Back up.** Supabase's free tier does not keep point-in-time backups. A
  monthly manual export from the dashboard costs nothing and is the difference
  between an incident and a disaster.

---

## Reporting a problem

If you find something, open a private security advisory on the repository rather
than a public issue.
