-- Workspace v2 · 0025_kanban_rich.sql
-- Upgrade the kanban from fixed columns (todo/doing/done) to a real Trello
-- board: user-created lists laid out horizontally, and richer cards
-- (description, due date, labels, checklist).

-- 1) User-created lists (columns) ------------------------------------------
create table if not exists public.kanban_lists (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kanban_lists_user_idx on public.kanban_lists (user_id);

alter table public.kanban_lists enable row level security;
drop policy if exists kanban_lists_all on public.kanban_lists;
create policy kanban_lists_all on public.kanban_lists
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Enrich cards -----------------------------------------------------------
alter table public.kanban_cards
  add column if not exists list_id     bigint references public.kanban_lists (id) on delete cascade,
  add column if not exists description text,
  add column if not exists due_date    date,
  add column if not exists labels      text[] not null default '{}',
  add column if not exists checklist   jsonb  not null default '[]'::jsonb;

create index if not exists kanban_cards_list_idx on public.kanban_cards (list_id);

-- `status` becomes optional (kept for backward compatibility; no longer used
-- by the app now that lists are user-defined).
alter table public.kanban_cards alter column status drop not null;
