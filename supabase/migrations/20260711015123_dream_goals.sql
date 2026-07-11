-- ============================================================================
-- 20260711015123_dream_goals.sql
-- Meta dos Sonhos: objetivos financeiros com imagem, link e progresso.
-- ============================================================================

create table if not exists public.dream_goals (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null check (char_length(trim(title)) between 2 and 120),
  category           text not null default 'outro'
    check (category in ('viagem', 'carro', 'casa', 'negocio', 'liberdade', 'familia', 'produto', 'outro')),
  target_amount_brl  numeric not null check (target_amount_brl > 0),
  current_amount_brl numeric not null default 0 check (current_amount_brl >= 0),
  image_url          text,
  external_url       text,
  notes              text,
  archived           boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists dream_goals_user_archived_idx
  on public.dream_goals (user_id, archived, created_at desc);

alter table public.dream_goals enable row level security;

drop policy if exists dream_goals_select on public.dream_goals;
create policy dream_goals_select on public.dream_goals
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists dream_goals_insert on public.dream_goals;
create policy dream_goals_insert on public.dream_goals
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists dream_goals_update on public.dream_goals;
create policy dream_goals_update on public.dream_goals
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists dream_goals_delete on public.dream_goals;
create policy dream_goals_delete on public.dream_goals
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.touch_dream_goals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dream_goals_touch_updated_at
  on public.dream_goals;
create trigger dream_goals_touch_updated_at
before update on public.dream_goals
for each row
execute function public.touch_dream_goals_updated_at();

create or replace function public.add_dream_goal_contribution(
  p_goal_id bigint,
  p_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_current numeric;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;

  update public.dream_goals
     set current_amount_brl = current_amount_brl + p_amount
   where id = p_goal_id
     and user_id = v_user
     and archived = false
  returning current_amount_brl into v_current;

  if v_current is null then raise exception 'dream goal not found'; end if;

  return v_current;
end;
$$;

revoke all on function public.add_dream_goal_contribution(bigint, numeric) from public, anon;
grant execute on function public.add_dream_goal_contribution(bigint, numeric) to authenticated;
