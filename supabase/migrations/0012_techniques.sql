-- M5+ · 0012_techniques.sql
-- Per-set intensity technique + user's custom techniques library.
-- The curated modern list lives in code (lib/techniques.ts); this table only
-- holds the user's own additions, which they can delete.

alter table public.set_logs
  add column if not exists technique text;

create table if not exists public.techniques (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.techniques enable row level security;

drop policy if exists techniques_all on public.techniques;
create policy techniques_all on public.techniques
  using (user_id = auth.uid()) with check (user_id = auth.uid());
