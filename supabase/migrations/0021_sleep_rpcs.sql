-- M7 · 0021_sleep_rpcs.sql
-- log_sleep (upsert + sleep_goal EXP when >= 7h) and log_weight (also syncs
-- profile.weight_kg so goal recalcs stay fresh).

create or replace function public.log_sleep(p_hours numeric, p_quality int)
returns table (exp_awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_awarded boolean := false;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_hours is null or p_hours <= 0 or p_hours > 24 then
    raise exception 'invalid hours';
  end if;

  v_date := public.user_local_date(v_user);
  insert into public.sleep_logs (user_id, ref_date, hours, quality)
  values (v_user, v_date, p_hours, p_quality)
  on conflict (user_id, ref_date)
    do update set hours = excluded.hours, quality = excluded.quality;

  if p_hours >= 7 then
    perform public._grant_exp(v_user, 'sleep_goal', v_date, 15);
    v_awarded := true;
  end if;

  return query select v_awarded;
end;
$$;

create or replace function public.log_weight(p_kg numeric)
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
  if p_kg is null or p_kg <= 0 then raise exception 'invalid weight'; end if;

  v_date := public.user_local_date(v_user);
  insert into public.weight_logs (user_id, ref_date, kg) values (v_user, v_date, p_kg);
  update public.profiles set weight_kg = p_kg where id = v_user;
end;
$$;

revoke all on function public.log_sleep(numeric, int) from public, anon;
revoke all on function public.log_weight(numeric) from public, anon;
grant execute on function public.log_sleep(numeric, int) to authenticated;
grant execute on function public.log_weight(numeric) to authenticated;
