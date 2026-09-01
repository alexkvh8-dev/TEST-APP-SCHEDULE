-- =====================================================================
-- FinX — migration 002
-- Adds: reminder interval, category budgets, receipt grouping.
-- Run this in the Supabase SQL editor AFTER schema.sql. Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: the nudge is now every N hours, not every 90 minutes
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists reminder_interval_hours smallint not null default 4;

alter table public.profiles
  drop constraint if exists profiles_reminder_interval_hours_check;
alter table public.profiles
  add constraint profiles_reminder_interval_hours_check
  check (reminder_interval_hours between 1 and 24);

-- Anyone created before this migration was on the old 90-minute setting.
update public.profiles set reminder_interval_hours = 4 where reminder_interval_hours is null;

-- ---------------------------------------------------------------------
-- expenses: items scanned from one receipt stay linked
-- ---------------------------------------------------------------------
alter table public.expenses add column if not exists group_id uuid;
alter table public.expenses add column if not exists source text not null default 'manual';

alter table public.expenses drop constraint if exists expenses_source_check;
alter table public.expenses
  add constraint expenses_source_check
  check (source in ('manual', 'voice', 'receipt', 'repeat'));

create index if not exists expenses_group_idx on public.expenses (group_id)
  where group_id is not null;

-- ---------------------------------------------------------------------
-- category_budgets: the envelopes on the Budget tab
-- ---------------------------------------------------------------------
create table if not exists public.category_budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid           not null references public.profiles (id) on delete cascade,
  category   text           not null,
  amount     numeric(14, 2) not null check (amount >= 0),
  created_at timestamptz    not null default now(),
  updated_at timestamptz    not null default now(),
  unique (user_id, category)
);

alter table public.category_budgets enable row level security;

drop policy if exists "own category budgets" on public.category_budgets;
create policy "own category budgets" on public.category_budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists category_budgets_touch_updated_at on public.category_budgets;
create trigger category_budgets_touch_updated_at
  before update on public.category_budgets
  for each row execute function public.touch_updated_at();
