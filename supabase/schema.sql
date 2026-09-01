-- =====================================================================
-- FinX — schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Safe to re-run.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on signup
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  full_name           text,
  avatar_url          text,
  -- Every expense is normalised into this currency for charts and totals.
  base_currency       text        not null default 'PKR',
  timezone            text        not null default 'Asia/Karachi',
  monthly_budget      numeric(14, 2),
  -- Inactivity nudge
  reminders_enabled   boolean     not null default true,
  reminder_start_hour smallint    not null default 9   check (reminder_start_hour between 0 and 23),
  reminder_end_hour   smallint    not null default 23  check (reminder_end_hour between 0 and 23),
  last_reminder_at    timestamptz,
  -- Local hour at which the daily wrap-up is generated + pushed
  daily_summary_hour  smallint    not null default 21  check (daily_summary_hour between 0 and 23),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid          not null references public.profiles (id) on delete cascade,
  item         text          not null check (char_length(item) between 1 and 200),
  amount       numeric(14, 2) not null check (amount > 0),
  currency     text          not null default 'PKR',
  -- amount converted to profiles.base_currency using rate_to_base, frozen at entry time
  base_amount  numeric(14, 2) not null check (base_amount >= 0),
  rate_to_base numeric(18, 8) not null default 1,
  note         text,
  category     text,
  -- 'need' | 'want' | 'unclear' — set by the classifier, editable by the user
  need_level   text          not null default 'unclear'
                             check (need_level in ('need', 'want', 'unclear')),
  spent_at     timestamptz   not null default now(),
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

create index if not exists expenses_user_spent_at_idx on public.expenses (user_id, spent_at desc);
create index if not exists expenses_user_created_at_idx on public.expenses (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- insights: cached AI summaries, one per (user, period, period_start)
-- ---------------------------------------------------------------------
create table if not exists public.insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  period       text        not null check (period in ('daily', 'weekly', 'monthly')),
  period_start date        not null,
  period_end   date        not null,
  -- { headline, verdict, tips[], could_have_saved, ... } — see src/lib/types.ts
  payload      jsonb       not null,
  -- set once the scheduled report has been pushed, so it never fires twice
  pushed_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, period, period_start)
);

-- Added after the first release; keeps re-runs on existing databases working.
alter table public.insights add column if not exists pushed_at timestamptz;

create index if not exists insights_user_period_idx
  on public.insights (user_id, period, period_start desc);

-- ---------------------------------------------------------------------
-- chat_messages: the finance coach conversation
-- ---------------------------------------------------------------------
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  role       text        not null check (role in ('user', 'assistant')),
  content    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at);

-- ---------------------------------------------------------------------
-- push_subscriptions: one row per browser/device
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------
-- Row Level Security — every table is scoped to the signed-in user.
-- The service-role key used by cron jobs bypasses RLS by design.
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.expenses            enable row level security;
alter table public.insights            enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.push_subscriptions  enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own insights" on public.insights;
create policy "own insights" on public.insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own chat" on public.chat_messages;
create policy "own chat" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Auto-create a profile row when a user signs up
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- keep updated_at honest
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at
  before update on public.expenses
  for each row execute function public.touch_updated_at();
