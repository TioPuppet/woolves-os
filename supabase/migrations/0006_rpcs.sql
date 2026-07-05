-- M3 · 0006_rpcs.sql
-- Server-authoritative mutations (R2). All are SECURITY DEFINER with a pinned
-- search_path. EXP amounts are hard-coded here (mirrors exp-config.ts) so the
-- client can never set them. Internal helpers are revoked from all client roles.

-- ── Internal helper: user's local calendar date (R3) ──────────────────────────
create or replace function public.user_local_date(p_user uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_user),
    'America/Sao_Paulo'
  ))::date;
$$;

-- ── Internal helper: append an EXP grant (idempotent per source/day) ──────────
create or replace function public._grant_exp(
  p_user uuid, p_source text, p_ref date, p_amount int
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.exp_events (user_id, source, ref_date, amount)
  values (p_user, p_source, p_ref, p_amount)
  on conflict (user_id, source, ref_date) do nothing;
$$;

-- Helpers must never be callable directly by clients.
revoke all on function public.user_local_date(uuid) from public, anon, authenticated;
revoke all on function public._grant_exp(uuid, text, date, int) from public, anon, authenticated;

-- ── log_water: add a pour, grant water_goal EXP when the goal is reached ──────
create or replace function public.log_water(p_ml int)
returns table (total_ml int, goal_ml int, exp_awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_total int;
  v_goal int;
  v_awarded boolean := false;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_ml is null or p_ml <= 0 then raise exception 'invalid ml'; end if;

  v_date := public.user_local_date(v_user);
  insert into public.water_logs (user_id, ref_date, ml) values (v_user, v_date, p_ml);

  select coalesce(sum(ml), 0) into v_total
    from public.water_logs where user_id = v_user and ref_date = v_date;
  select goal_water_ml into v_goal from public.profiles where id = v_user;

  if v_goal is not null and v_total >= v_goal then
    perform public._grant_exp(v_user, 'water_goal', v_date, 15);
    v_awarded := true;
  end if;

  return query select v_total, v_goal, v_awarded;
end;
$$;

-- ── toggle_habit: mark a habit done/undone; grant required_habit EXP on done ──
-- The ledger is immutable (R2): toggling off never revokes an already-earned
-- grant; the UNIQUE constraint prevents re-granting the same day.
create or replace function public.toggle_habit(p_key text, p_done boolean)
returns table (exp_awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_key text := coalesce(nullif(trim(p_key), ''), 'required');
  v_awarded boolean := false;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  v_date := public.user_local_date(v_user);

  insert into public.habit_logs (user_id, ref_date, habit_key, done)
  values (v_user, v_date, v_key, coalesce(p_done, true))
  on conflict (user_id, habit_key, ref_date)
    do update set done = excluded.done;

  if coalesce(p_done, true) and v_key = 'required' then
    perform public._grant_exp(v_user, 'required_habit', v_date, 20);
    v_awarded := true;
  end if;

  return query select v_awarded;
end;
$$;

-- ── submit_checkin: close the day, set status, update streak, grant EXP ───────
create or replace function public.submit_checkin(
  p_mood int, p_note text, p_mission_done boolean
)
returns table (day_status text, streak int, exp_from_checkin int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_prev date;
  v_streak int;
  v_status text;
  v_bonus int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_mood is null or p_mood < 1 or p_mood > 5 then
    raise exception 'invalid mood';
  end if;

  v_date := public.user_local_date(v_user);
  v_status := case when coalesce(p_mission_done, false) then 'completed' else 'broken' end;

  select current_streak, last_checkin_date into v_streak, v_prev
    from public.profiles where id = v_user;

  if v_prev = v_date then
    v_streak := coalesce(v_streak, 0);            -- already checked in today
  elsif v_prev = (v_date - 1) then
    v_streak := coalesce(v_streak, 0) + 1;        -- consecutive day
  else
    v_streak := 1;                                -- streak reset / first day
  end if;

  insert into public.checkins (user_id, ref_date, mood, note, day_status)
  values (v_user, v_date, p_mood, p_note, v_status)
  on conflict (user_id, ref_date)
    do update set mood = excluded.mood, note = excluded.note,
                  day_status = excluded.day_status;

  update public.profiles
     set current_streak = v_streak, last_checkin_date = v_date
   where id = v_user;

  perform public._grant_exp(v_user, 'night_checkin', v_date, 25);
  v_bonus := least(v_streak * 10, 50);            -- +10/day capped at +50
  if v_bonus > 0 then
    perform public._grant_exp(v_user, 'streak_bonus', v_date, v_bonus);
  end if;

  return query select v_status, v_streak, 25;
end;
$$;

-- ── get_exp_total: cumulative EXP for the current user ────────────────────────
create or replace function public.get_exp_total()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::int
    from public.exp_events where user_id = auth.uid();
$$;

-- Expose only the public RPCs to authenticated users.
revoke all on function public.log_water(int)                 from public, anon;
revoke all on function public.toggle_habit(text, boolean)    from public, anon;
revoke all on function public.submit_checkin(int, text, boolean) from public, anon;
revoke all on function public.get_exp_total()                from public, anon;

grant execute on function public.log_water(int)                 to authenticated;
grant execute on function public.toggle_habit(text, boolean)    to authenticated;
grant execute on function public.submit_checkin(int, text, boolean) to authenticated;
grant execute on function public.get_exp_total()                to authenticated;
