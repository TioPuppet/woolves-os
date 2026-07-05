-- M3 · 0005_streak_columns.sql
-- Streak state on the profile. Updated ONLY by the submit_checkin RPC (0006).

alter table public.profiles
  add column if not exists current_streak   integer not null default 0,
  add column if not exists last_checkin_date date;
