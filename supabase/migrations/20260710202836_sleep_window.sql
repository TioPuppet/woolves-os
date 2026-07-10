-- Sono 2.1 · janela de sono
-- Guarda horário de dormir/acordar para evoluir regularidade e futuras integrações.

alter table public.sleep_logs
  add column if not exists bed_time time,
  add column if not exists wake_time time;

comment on column public.sleep_logs.bed_time is 'Horário local aproximado em que o usuário dormiu.';
comment on column public.sleep_logs.wake_time is 'Horário local aproximado em que o usuário acordou.';

drop function if exists public.log_sleep(numeric, int);

create or replace function public.log_sleep(
  p_hours numeric,
  p_quality int,
  p_bed_time time default null,
  p_wake_time time default null
)
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
  if p_quality is not null and (p_quality < 1 or p_quality > 5) then
    raise exception 'invalid quality';
  end if;

  v_date := public.user_local_date(v_user);
  insert into public.sleep_logs (
    user_id,
    ref_date,
    hours,
    quality,
    bed_time,
    wake_time
  )
  values (
    v_user,
    v_date,
    p_hours,
    p_quality,
    p_bed_time,
    p_wake_time
  )
  on conflict (user_id, ref_date)
    do update set
      hours = excluded.hours,
      quality = excluded.quality,
      bed_time = excluded.bed_time,
      wake_time = excluded.wake_time;

  if p_hours >= 7 then
    perform public._grant_exp(v_user, 'sleep_goal', v_date, 15);
    v_awarded := true;
  end if;

  return query select v_awarded;
end;
$$;

revoke all on function public.log_sleep(numeric, int, time, time) from public, anon;
grant execute on function public.log_sleep(numeric, int, time, time) to authenticated;
