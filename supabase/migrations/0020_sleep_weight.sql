-- M7 · 0020_sleep_weight.sql
-- Sleep (one per local day, with quality) and weight quick logs.

create table if not exists public.sleep_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  hours      numeric not null check (hours > 0 and hours <= 24),
  quality    int     check (quality between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, ref_date)
);
create index if not exists sleep_logs_user_date_idx
  on public.sleep_logs (user_id, ref_date);

create table if not exists public.weight_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  kg         numeric not null check (kg > 0),
  created_at timestamptz not null default now()
);
create index if not exists weight_logs_user_date_idx
  on public.weight_logs (user_id, ref_date);

alter table public.sleep_logs  enable row level security;
alter table public.weight_logs enable row level security;

drop policy if exists sleep_logs_all on public.sleep_logs;
create policy sleep_logs_all on public.sleep_logs
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists weight_logs_all on public.weight_logs;
create policy weight_logs_all on public.weight_logs
  using (user_id = auth.uid()) with check (user_id = auth.uid());
