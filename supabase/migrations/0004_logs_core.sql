-- M3 · 0004_logs_core.sql
-- Core daily logs: water (accumulating), required/optional habits, night check-in.
-- RLS: owner-only. Writes go through RPCs (0006), but owner SELECT is allowed so
-- the client can read today's totals for optimistic UI.

-- Water: one row per pour; summed per local day.
create table if not exists public.water_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  ml         integer not null check (ml > 0),
  created_at timestamptz not null default now()
);
create index if not exists water_logs_user_date_idx
  on public.water_logs (user_id, ref_date);

-- Habits: one row per habit_key per local day ('required' = the required habit).
create table if not exists public.habit_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  habit_key  text    not null,
  done       boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, habit_key, ref_date)
);

-- Night check-in: one per local day, closes the day.
create table if not exists public.checkins (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  mood       integer not null check (mood between 1 and 5),
  note       text,
  day_status text    not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref_date)
);

-- RLS
alter table public.water_logs enable row level security;
alter table public.habit_logs enable row level security;
alter table public.checkins   enable row level security;

drop policy if exists water_logs_select_own on public.water_logs;
create policy water_logs_select_own on public.water_logs
  for select using (user_id = auth.uid());

drop policy if exists habit_logs_select_own on public.habit_logs;
create policy habit_logs_select_own on public.habit_logs
  for select using (user_id = auth.uid());

drop policy if exists checkins_select_own on public.checkins;
create policy checkins_select_own on public.checkins
  for select using (user_id = auth.uid());
