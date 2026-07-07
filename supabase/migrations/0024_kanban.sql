-- Workspace · 0024_kanban.sql
-- Trello-style kanban cards (personal board, fixed columns todo/doing/done).

create table if not exists public.kanban_cards (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  status     text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kanban_user_idx on public.kanban_cards (user_id);

alter table public.kanban_cards enable row level security;

drop policy if exists kanban_all on public.kanban_cards;
create policy kanban_all on public.kanban_cards
  using (user_id = auth.uid()) with check (user_id = auth.uid());
