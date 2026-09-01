-- =====================================================================
-- FinX — migration 003: first-run onboarding
-- Run this in the Supabase SQL editor after migration-002.
-- Safe to re-run.
-- =====================================================================

-- What the welcome flow collects. All nullable: someone who skips a question
-- still gets a working app, they just get a less specific budget suggestion.
alter table public.profiles
  add column if not exists country text,
  add column if not exists monthly_income numeric(14, 2),
  add column if not exists primary_goal text,
  add column if not exists onboarded_at timestamptz;

-- Guard the goal against arbitrary text, since it drives copy in the app.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_primary_goal_check'
  ) then
    alter table public.profiles
      add constraint profiles_primary_goal_check
      check (
        primary_goal is null
        or primary_goal in ('save', 'debt', 'awareness', 'budget')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_monthly_income_check'
  ) then
    alter table public.profiles
      add constraint profiles_monthly_income_check
      check (monthly_income is null or monthly_income >= 0);
  end if;
end $$;

-- Anyone who already has data predates the welcome flow, so mark them done
-- rather than interrupting them with questions about an account they are
-- already using.
update public.profiles p
set onboarded_at = coalesce(p.onboarded_at, now())
where p.onboarded_at is null
  and exists (select 1 from public.expenses e where e.user_id = p.id);
