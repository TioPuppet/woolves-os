-- ============================================================================
-- 0028_daily_mission.sql · Missão do dia editável (uma por dia local)
-- ----------------------------------------------------------------------------
-- A "Missão de hoje" passa a ser um texto editável pelo usuário, único por dia
-- local. Escrita via RPC SECURITY DEFINER (auth.uid + user_local_date), no mesmo
-- padrão server-authoritative de log_water/toggle_habit.
-- ============================================================================

create table if not exists public.daily_missions (
  user_id    uuid not null references auth.users (id) on delete cascade,
  ref_date   date not null,
  text       text not null default '',
  done       boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, ref_date)
);

alter table public.daily_missions enable row level security;

drop policy if exists daily_missions_all on public.daily_missions;
create policy daily_missions_all on public.daily_missions
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists daily_missions_set_updated_at on public.daily_missions;
create trigger daily_missions_set_updated_at before update on public.daily_missions
  for each row execute function public.set_updated_at();

-- ── set_daily_mission: define/edita o texto da missão de hoje ────────────────
create or replace function public.set_daily_mission(p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  v_date := public.user_local_date(v_user);
  insert into public.daily_missions (user_id, ref_date, text)
    values (v_user, v_date, coalesce(p_text, ''))
  on conflict (user_id, ref_date)
    do update set text = coalesce(p_text, ''), updated_at = now();
end;
$$;

-- ── set_mission_done: marca/desmarca a missão de hoje ────────────────────────
create or replace function public.set_mission_done(p_done boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  v_date := public.user_local_date(v_user);
  insert into public.daily_missions (user_id, ref_date, done)
    values (v_user, v_date, coalesce(p_done, false))
  on conflict (user_id, ref_date)
    do update set done = coalesce(p_done, false), updated_at = now();
end;
$$;
