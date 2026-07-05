-- M1 · 0001_profiles.sql
-- User profile: timezone (R3), body metrics, and MVP goals.
-- RLS (R4): a user can only see/modify their own row.

create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  -- R3: all "day" logic uses this timezone, never raw UTC.
  timezone              text    not null default 'America/Sao_Paulo',
  display_name          text,
  sex                   text    check (sex in ('male', 'female')),
  birth_date            date,
  height_cm             numeric check (height_cm is null or height_cm > 0),
  weight_kg             numeric check (weight_kg is null or weight_kg > 0),
  activity_level        text    check (activity_level in
                          ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  -- MVP goals (all user-overridable during onboarding).
  goal_kcal             integer check (goal_kcal is null or goal_kcal > 0),
  goal_protein_g        integer check (goal_protein_g is null or goal_protein_g > 0),
  goal_water_ml         integer check (goal_water_ml is null or goal_water_ml > 0),
  goal_spend_limit_brl  numeric check (goal_spend_limit_brl is null or goal_spend_limit_brl >= 0),
  required_habit        text,
  onboarding_done       boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Keep updated_at fresh on any change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS (R4)
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
