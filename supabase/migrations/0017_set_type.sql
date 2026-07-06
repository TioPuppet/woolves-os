-- M5+ · 0017_set_type.sql
-- Optional per-set type: 'warmup' (reconhecimento/aquecimento) or 'work'.
-- Last-performance considers only work sets so the reference isn't skewed.

alter table public.set_logs
  add column if not exists set_type text not null default 'work';

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
      and coalesce(sl.set_type, 'work') = 'work'
  )
  select sl.set_no, sl.reps, sl.load_kg, sl.rpe, ws.ref_date
  from public.set_logs sl
  join public.workout_sessions ws on ws.id = sl.session_id
  where ws.user_id = auth.uid()
    and sl.exercise_id = p_exercise_id
    and ws.completed = true
    and coalesce(sl.set_type, 'work') = 'work'
    and ws.ref_date = (select d from last_day)
  order by sl.set_no;
$$;
