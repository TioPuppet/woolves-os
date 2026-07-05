-- M5 · 0011_training_rpcs.sql
-- Complete a session (grants workout_completed EXP) and read last performance.

create or replace function public.complete_session(p_session_id bigint)
returns table (exp_awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  update public.workout_sessions
     set completed = true
   where id = p_session_id and user_id = v_user
  returning ref_date into v_date;

  if v_date is null then raise exception 'session not found'; end if;

  perform public._grant_exp(v_user, 'workout_completed', v_date, 50);
  return query select true;
end;
$$;

-- Last completed performance for an exercise (for the "last time" hint).
create or replace function public.last_exercise_performance(p_exercise_id bigint)
returns table (set_no int, reps int, load_kg numeric, rpe numeric, ref_date date)
language sql
stable
security definer
set search_path = public
as $$
  with last_day as (
    select max(ws.ref_date) as d
    from public.workout_sessions ws
    join public.set_logs sl on sl.session_id = ws.id
    where ws.user_id = auth.uid()
      and sl.exercise_id = p_exercise_id
      and ws.completed = true
  )
  select sl.set_no, sl.reps, sl.load_kg, sl.rpe, ws.ref_date
  from public.set_logs sl
  join public.workout_sessions ws on ws.id = sl.session_id
  where ws.user_id = auth.uid()
    and sl.exercise_id = p_exercise_id
    and ws.completed = true
    and ws.ref_date = (select d from last_day)
  order by sl.set_no;
$$;

revoke all on function public.complete_session(bigint) from public, anon;
revoke all on function public.last_exercise_performance(bigint) from public, anon;
grant execute on function public.complete_session(bigint) to authenticated;
grant execute on function public.last_exercise_performance(bigint) to authenticated;
