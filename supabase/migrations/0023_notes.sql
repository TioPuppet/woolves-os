-- Notes · 0023_notes.sql
-- iPhone-Notes-style notes: a single free-text content per note (title = first line).

create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes
  using (user_id = auth.uid()) with check (user_id = auth.uid());
