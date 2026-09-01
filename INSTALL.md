# Getting FinX onto your phone and desktop

There is no app store download. FinX is a **PWA** — you put it online once
(free), then install it straight from the browser. After that it behaves like a
normal app: its own icon, no address bar, works offline for the shell.

Everything below is done in a browser. **No terminal needed.**

---

## Part 1 — Put it online (about 10 minutes, once)

### 1.1 Create the database

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in
   with GitHub → **New project**.
   - Name it anything. Pick the region closest to you.
   - Set a database password and save it somewhere. (You will not need it for
     the app — only if you ever open the database directly.)
2. Wait for the project to finish setting up (~1 minute).
3. Left sidebar → **SQL Editor** → **New query**.
4. Open [`supabase/schema.sql`](supabase/schema.sql) in this repo, copy **all**
   of it, paste it into the editor, and press **Run**.
   You should see *Success. No rows returned.*
5. **New query** again, and do the same with
   [`supabase/migration-002-features.sql`](supabase/migration-002-features.sql).
   This adds the reminder spacing setting, category budgets, and the columns
   behind voice logging and receipt scanning. It is safe to run more than once.
6. **New query** once more for
   [`supabase/migration-003-onboarding.sql`](supabase/migration-003-onboarding.sql),
   which adds the fields the welcome questions fill in. Also safe to re-run.
7. Left sidebar → **Authentication** → **Sign In / Providers** → **Email**:
   - Make sure **Enable email provider** is on.
   - **Confirm email**: leave it *off* until you have real email sending set up
     (see below). With the built-in mailer capped at about two messages an hour,
     leaving it on means other people's signups silently fail. Turning it off
     weakens nothing else — see [SECURITY.md](SECURITY.md) for what actually
     protects accounts, none of which involves email.
   - **Save**.

   With it off, signup completes immediately and no email is sent at all. If
   you switch it on later the app still works — it tells the new user to check
   their inbox and sign in once confirmed.
8. **Skip the email templates.** Supabase keeps them read-only until the project
   has its own SMTP, and nothing here needs them. The one thing that does want
   working email is **"Forgot password"** — until you set sending up, reset a
   password yourself under **Authentication → Users**. When you are ready, see
   [Sending real email to other people](#sending-real-email-to-other-people).
9. Left sidebar → **Project Settings** (gear) → **API Keys**. Keep this tab open —
   you need three values in a moment:
   - **Project URL**
   - **anon / public** key
   - **service_role** key (click to reveal — this one is secret)

### 1.2 Get a free Gemini key *(optional, but do it — it is 30 seconds)*

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → sign in
with any Google account → **Create API key** → copy it.

No credit card, no billing setup. Skip this and the app still sorts needs vs
wants and writes summaries using its built-in rules.

### 1.3 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign up** → **Continue with GitHub**.
2. **Add New… → Project** → find **TEST-APP-SCHEDULE** → **Import**.
   (If you do not see it, click **Adjust GitHub App Permissions** and grant
   access to the repo.)
3. Leave the framework preset as **Next.js** and do not change the build settings.
4. Expand **Environment Variables** and add these:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 1.1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `GEMINI_API_KEY` | your Gemini key (skip if you did not make one) |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | see below |
   | `VAPID_PRIVATE_KEY` | see below |
   | `VAPID_SUBJECT` | `mailto:your@email.com` |
   | `CRON_SECRET` | any long random string |

   **The two VAPID values** are a keypair that lets your own server send push
   notifications to your own devices. Generate a pair with:

   ```bash
   npx web-push generate-vapid-keys
   ```

   Generate them yourself rather than using a website — the private key is what
   authorises push to your devices, and there is no reason for anyone else to
   ever see it. If you have no terminal to hand, leave all three VAPID rows out
   for now: everything else works, you just get no notifications until you add
   them and redeploy.

5. **Deploy.** After a minute you get a URL like
   `https://test-app-schedule.vercel.app` — **that URL is your app.**

### 1.4 Point Supabase at your new URL

Back in Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/**`

Save. Now open your URL, tap **Create account**, and sign up with your email and
a password. You are in.

> **Signing in on another device later uses this same email and password**, and
> everything you have logged will be there. That is the whole point of the login.

---

## Part 2 — Install on your phone

### Android (Chrome) — the recommended route

Chrome's **Install** does not make a shortcut. It builds a **WebAPK**: a real
Android app, signed by Google's build service, that appears in the app drawer
and in Settings → Apps and uninstalls like any other. It never shows a URL bar,
and it needs no Digital Asset Links, no fingerprints and no verification —
Chrome made the app itself, so the trust is implicit.

1. Open your Vercel URL in **Chrome**. It must be Chrome.
2. You will usually get an **Install app** banner at the bottom — tap it.
3. If not: **⋮** menu (top right) → **Add to Home screen** → **Install**.

> **No Install option?** If you have previously sideloaded the `.apk`, uninstall
> it first. While it is installed it claims the site's scope, so Chrome treats
> the app as already installed and stops offering Install.

### iPhone / iPad (Safari — it must be Safari)

1. Open your Vercel URL in **Safari**.
2. Tap the **Share** button (the square with an arrow, at the bottom).
3. Scroll down → **Add to Home Screen** → **Add**.

> On iPhone, notifications **only** work after you have added it to the home
> screen, and only on iOS 16.4 or newer. That is an Apple rule, not an app one.
> Open the app from the home-screen icon, not from Safari.

---

## Part 3 — Install on desktop

### Chrome, Edge, or Brave (Windows, Mac, Linux)

1. Open your Vercel URL.
2. Look for the **install icon** in the address bar — a small monitor with a
   downward arrow, on the right-hand side.
3. Click it → **Install**.

Alternatively: **⋮** menu → **Cast, save and share** → **Install page as app**
(Chrome), or **Apps → Install this site as an app** (Edge).

It gets a real icon in your Start menu / Applications / dock and opens in its own
window.

### Safari on Mac

**File → Add to Dock.**

---

## Part 4 — Turn on the reminders

Once installed, open the app → **Settings** tab:

1. **Notifications on this device** → **Turn on** → allow when the browser asks.
   You should immediately get a test notification.
2. Set **How often at most** to the longest gap you want to go unnoticed. Four
   hours is the default and the one to keep unless you have a reason.
3. Set **Only between** to your waking hours, so you never get nudged at 3 AM.
4. Set **Daily summary at** to when you want the end-of-day wrap-up.

Do this separately on each device you want notified.

---

## Part 5 — Switch on the scheduler

This is what actually sends the inactivity nudge and the Sunday/monthly reports.

1. On GitHub, go to your repo → **Settings** → **Secrets and variables** →
   **Actions**.
2. **Variables** tab → **New repository variable**:
   - Name `APP_URL`, value `https://your-app.vercel.app` (no trailing slash)
3. **Secrets** tab → **New repository secret**:
   - Name `CRON_SECRET`, value — **exactly** the same string you put in Vercel.
4. Go to the **Actions** tab → **Scheduled jobs** → **Run workflow** to test it.
   Both steps should finish green with `HTTP 200`.

That is it. It now runs every 15 minutes on its own, for free.

> GitHub switches off scheduled workflows after 60 days with no commits to the
> repo. If notifications go quiet, open the Actions tab and hit **Run workflow**
> to wake it up again.

---

## Just want to try it on your computer first?

If you have Node 20+ installed:

```bash
git clone https://github.com/alexkvh8-dev/TEST-APP-SCHEDULE.git
cd TEST-APP-SCHEDULE
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

Open <http://localhost:3000>. You still need the Supabase project from step 1.1,
but you can skip Vercel entirely while you are trying it out.

---

## Sending real email to other people

Supabase's built-in mailer is **for development only**. It sends roughly 2
messages an hour, only to your own address, from shared infrastructure. If you
open the app to other people without replacing it, their confirmation emails
will simply never arrive and they will have no way in.

Do not use a Gmail App Password for this either. It works for you alone, but
Google throttles it, sending app mail through a personal account is outside
what that access is meant for, and every message would arrive from your own
address.

### You need a domain. Here is why it is not optional.

Since February 2024 **Gmail and Yahoo reject or spam-folder bulk mail that is
not authenticated with SPF and DKIM.** Those are DNS records, and DNS records
need a domain you control. Send from an unauthenticated address and your
signup emails land in spam for most of your users — which looks exactly like
"the app is broken".

A domain is the only part of this that costs money:

- **Cloudflare Registrar** sells at wholesale — a `.com` is around $10/year with
  no markup and no first-year-cheap-then-expensive trick.
- **Porkbun** or **Namecheap** often have `.xyz` or `.site` for **$1–3 for the
  first year**.

That is the whole bill. Every service below is free at this size.

### The setup: Resend + your domain

Resend is built for exactly this — transactional mail from an app — and gives
**3,000 emails a month, 100 a day, free forever**. At one confirmation per
signup that is a lot of users.

1. Buy a domain (above). Point its nameservers at Cloudflare if it is not
   already there — free, and it makes step 3 a two-minute job.
2. Sign up at [resend.com](https://resend.com). No card.
3. **Domains → Add Domain** → type your domain. Resend shows three DNS records
   (one MX-style for the sending subdomain, one DKIM `TXT`, one SPF `TXT`).
   Add them in Cloudflare under **DNS → Records**, exactly as shown, and set
   each to **DNS only** (grey cloud, not orange).
4. Wait for Resend to show **Verified** — usually minutes.
5. **API Keys → Create API Key.** Copy it.
6. In Supabase: **Project Settings → Authentication → SMTP Settings** →
   **Enable Custom SMTP**:

   | Field | Value |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `587` |
   | Username | `resend` |
   | Password | your Resend API key |
   | Sender email | `noreply@yourdomain.com` |
   | Sender name | `FinX` |

7. **Save.** Sign up with an address you do not own — a friend's, or a
   throwaway — and confirm it arrives in the inbox rather than spam.

### Alternatives, all free at this size

| Service | Free allowance | SMTP host | Notes |
|---|---|---|---|
| **Resend** | 3,000/mo · 100/day | `smtp.resend.com` | Recommended. Domain required to send to anyone but yourself. |
| **Brevo** | 300/day (~9,000/mo) | `smtp-relay.brevo.com` | Highest allowance. Sign up on the free plan and ignore the upgrade page it pushes you toward. |
| **Mailjet** | 200/day · 6,000/mo | `in-v3.mailjet.com` | Straightforward, generous. |
| **SMTP2GO** | 1,000/mo | `mail.smtp2go.com` | Smallest, simplest. |
| **Amazon SES** | not free, but ~$0.10 per 1,000 | `email-smtp.<region>.amazonaws.com` | Cheapest at scale. Needs an AWS account and a "production access" request. |

Whichever you pick, **authenticate the domain with SPF and DKIM in its
dashboard.** Skipping that is the single most common reason signup emails go
missing.

### After SMTP is connected

The **Authentication → Emails** templates unlock. If you want signup to send a
**6-digit code** rather than a link, open **Confirm signup** and use:

```html
<h2>Your FinX code</h2>
<p>Enter this code to finish creating your account:</p>
<p style="font-size:28px;letter-spacing:6px;"><strong>{{ .Token }}</strong></p>
<p>It expires in an hour. If you did not ask for this, ignore this email.</p>
```

The app accepts both, so this is a preference rather than a requirement.

Also raise the limits under **Authentication → Rate Limits** — Supabase caps
confirmation emails per hour independently of your SMTP provider, and the
default is tuned for the built-in mailer.

---

## If something is not working

| What you see | What it means |
|---|---|
| "Failed to fetch" or a blank screen after signing up | The Supabase URL or anon key is wrong, or **Site URL** in step 1.4 does not match your Vercel URL |
| Signup says "check your email" and nothing arrives | **Confirm email** is still on — turn it off (step 1.1) and sign up again |
| No **Install** option in the browser | You are not on **https**. Installing needs the deployed URL, not a local IP |
| No install prompt on iPhone | You are not in Safari, or you are looking for a button — it is under the **Share** menu |
| Notifications never arrive | Check Part 5 is done and the Actions run went green; on iPhone, check you opened it from the home-screen icon |
| Everything works but summaries are basic | No `GEMINI_API_KEY` set — that is the built-in rules engine doing its job. Add the key and redeploy |

---

## Want a real `.apk` instead?

Chrome's **Install** already gives you a proper Android app (a WebAPK) — its own
icon, its own entry in the app drawer and in Settings → Apps, no browser UI, and
it uninstalls like any other app. For most people that is the end of the story.

If you specifically want an **`.apk` file** — to sideload, to share with someone,
or to put on the Play Store — build one from the same URL. It wraps the PWA in a
Trusted Web Activity, so it stays a single codebase and keeps updating itself
whenever the site redeploys.

### Build it (free, in a browser)

1. Go to **[pwabuilder.com](https://www.pwabuilder.com)**
2. Enter your app's URL → **Start**
3. **Package for stores** → pick the **Android** tile

   > Watch which tile you click. Windows gives you `.msix` / `.appxbundle` /
   > `install.ps1`, which install on a PC and do nothing on a phone. Android is
   > the one that produces a `.apk`.

4. Open the **advanced settings** panel before generating and set
   **Fallback behavior** to **`webview`**, not the default `customtabs`.

   This is the single most useful setting on the page. A TWA is rendered by
   Chrome, and only Chrome. When it cannot be — Chrome is not the default
   browser, or the device ships Mi Browser or Samsung Internet — the app falls
   back, and the two fallbacks are very different:

   | Setting | What you get when TWA cannot run |
   |---|---|
   | `customtabs` *(default)* | A Chrome Custom Tab, **with the white address bar across the top** |
   | `webview` | A plain WebView — **no address bar, ever**, on any device |

   Leave the asset links configured either way: with both in place the app uses
   real TWA where it can and only drops to the WebView where it cannot.

   The trade on the WebView path is push notifications: a WebView has no
   service worker, so reminders will not fire there. Voice and camera still
   work once Android grants the permissions.

5. **Generate**.

6. Download the zip. Inside you get:
   - `app-release-signed.apk` — sideload this straight onto a phone
   - `signing.keystore` + a password — **keep these safe**, you need the same
     key to ship any future update
   - `assetlinks.json` — contains your SHA-256 fingerprint

### Then remove the URL bar

A freshly built APK shows a Chrome address bar across the top until Android can
confirm the app and the website share an owner. Two environment variables fix it:

1. Open the `assetlinks.json` from the zip. Copy **the real values** out of it —
   `package_name`, and the string inside `sha256_cert_fingerprints`.

   > The fingerprint is **95 characters**: 32 pairs of hex separated by colons.
   > If what you copied is short, or contains an ellipsis, or has quotes or
   > square brackets around it, you have grabbed an example instead of the
   > value. Google reports that as `ERROR_CODE_MALFORMED_CONTENT`, which looks
   > like a broken server rather than a wrong setting.

2. In **Vercel → Environments → Production** add:

   | Name | Value |
   |---|---|
   | `ANDROID_PACKAGE_NAME` | the `package_name` from the file |
   | `ANDROID_CERT_FINGERPRINT` | the 95-character fingerprint from the file |

3. **Redeploy** (Deployments → ⋯ → Redeploy)
4. Check it worked: open `https://your-app.vercel.app/.well-known/assetlinks.json`
   — it should show your fingerprint, not `[]`. An empty list means the values
   were missing or did not look like a real fingerprint and package name; the
   route refuses to publish anything malformed.
5. Confirm Google agrees, which is what Android actually asks:

   ```
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://your-app.vercel.app&relation=delegate_permission/common.handle_all_urls
   ```

6. **Uninstall the app, then install the APK again.** Android checks this once,
   at install time, and caches the answer — redeploying the site does nothing
   for an app that is already installed. The URL bar is gone.

### Installing the APK on your phone

Copy the `.apk` across, tap it, and allow **Install unknown apps** for whichever
app you opened it from. Android will warn you it is from an unknown source —
that is expected for any app not from the Play Store.

### If the APK keeps showing the URL bar

Work through these in order — the first two are the usual answer:

1. **Was the package built with `fallbackType: webview`?** If it was left at
   `customtabs`, the bar is guaranteed on any device that cannot run a TWA, and
   no amount of correct asset links will remove it. Rebuild with the setting
   changed. This is by far the most common cause.

2. **Is Chrome the default browser?** **Settings → Apps → Default apps →
   Browser.** A TWA only runs under Chrome. Xiaomi and Samsung devices often
   default to their own browser, which has no TWA support.

3. **Did you reinstall after fixing the asset links?** Android checks them once,
   at install time, and caches the answer. A redeploy changes nothing for an app
   that is already installed — uninstall it and install again.

4. **Do the APK and the fingerprint come from the same download?** PWABuilder
   generates a fresh signing key every time you download a package, so an APK
   from one download will never verify against an `assetlinks.json` from
   another.

5. **Are you opening it from the app icon?** Tapping a link in WhatsApp or a
   notification opens a Custom Tab, which looks identical and has nothing to do
   with your app.

### The Windows package, while you are there

PWABuilder's **Windows** tile produces `.msix` / `.appxbundle` files and an
`install.ps1`. That is not an Android app, but it is a real Windows one: run
`install.ps1` (right-click → **Run with PowerShell**, or
`powershell -ExecutionPolicy Bypass -File .\install.ps1` if Windows blocks it)
and FinX lands in the Start menu properly rather than as a browser shortcut.

### Play Store

The same zip contains an `.aab` for the Play Store, but a Play developer account
is a **one-off $25**. Everything else in this project is free, so this is the one
place you would spend money — and only if you want it publicly listed.
