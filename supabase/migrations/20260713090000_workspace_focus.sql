-- Espaço 2.0: metadados de páginas e histórico de foco.

alter table public.notes
  add column if not exists tags text[] not null default '{}',
  add column if not exists pinned boolean not null default false,
  add column if not exists archived boolean not null default false;

create index if not exists notes_user_pinned_idx
  on public.notes (user_id, pinned desc, updated_at desc)
  where archived = false;

create table if not exists public.focus_sessions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  note_id       bigint references public.notes (id) on delete set null,
  card_id       bigint references public.kanban_cards (id) on delete set null,
  mode          text not null check (mode in ('pomodoro', 'stopwatch')),
  focus_seconds integer not null check (focus_seconds >= 0),
  cycles        integer not null default 1 check (cycles >= 1),
  started_at    timestamptz not null,
  ended_at      timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists focus_sessions_user_created_idx
  on public.focus_sessions (user_id, created_at desc);

alter table public.focus_sessions enable row level security;

drop policy if exists focus_sessions_all on public.focus_sessions;
create policy focus_sessions_all on public.focus_sessions
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
