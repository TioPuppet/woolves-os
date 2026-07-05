-- M3 · 0003_exp_ledger.sql
-- R2 — server-authoritative, append-only EXP ledger.
-- Writes happen ONLY via SECURITY DEFINER RPCs (0006). No client insert policy.
-- UNIQUE(user_id, source, ref_date) prevents farming (one grant per source/day).

create table if not exists public.exp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  source     text    not null,
  ref_date   date    not null,
  amount     integer not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, source, ref_date)
);

create index if not exists exp_events_user_date_idx
  on public.exp_events (user_id, ref_date);

alter table public.exp_events enable row level security;

-- Read-only for the owner; there is intentionally NO insert/update/delete policy.
drop policy if exists exp_events_select_own on public.exp_events;
create policy exp_events_select_own on public.exp_events
  for select using (user_id = auth.uid());
