-- M6 · 0019_finance_rpcs.sql
-- log_transaction (records expense/income, returns today's totals) and an
-- updated submit_checkin that grants spend_within_limit (25) when the day's
-- spending stayed within the daily limit.

create or replace function public.log_transaction(
  p_type text, p_amount numeric, p_category text, p_note text
)
returns table (spent_today numeric, income_today numeric, spend_limit numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_type not in ('expense', 'income') then raise exception 'invalid type'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;

  v_date := public.user_local_date(v_user);
  insert into public.transactions (user_id, ref_date, type, amount_brl, category, note)
  values (v_user, v_date, p_type, p_amount,
          nullif(trim(p_category), ''), nullif(trim(p_note), ''));

  return query
    select
      coalesce((select sum(amount_brl) from public.transactions
                where user_id = v_user and ref_date = v_date and type = 'expense'), 0),
      coalesce((select sum(amount_brl) from public.transactions
                where user_id = v_user and ref_date = v_date and type = 'income'), 0),
      (select goal_spend_limit_brl from public.profiles where id = v_user);
end;
$$;

revoke all on function public.log_transaction(text, numeric, text, text) from public, anon;
grant execute on function public.log_transaction(text, numeric, text, text) to authenticated;

-- Updated check-in: now also grants spend_within_limit when applicable.
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
  v_spend numeric;
  v_limit numeric;
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
    v_streak := coalesce(v_streak, 0);
  elsif v_prev = (v_date - 1) then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
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
  v_bonus := least(v_streak * 10, 50);
  if v_bonus > 0 then
    perform public._grant_exp(v_user, 'streak_bonus', v_date, v_bonus);
  end if;

  -- Finance: reward staying within the daily spend limit.
  select coalesce(sum(amount_brl), 0) into v_spend
    from public.transactions
   where user_id = v_user and ref_date = v_date and type = 'expense';
  select goal_spend_limit_brl into v_limit from public.profiles where id = v_user;
  if v_limit is not null and v_spend <= v_limit then
    perform public._grant_exp(v_user, 'spend_within_limit', v_date, 25);
  end if;

  return query select v_status, v_streak, 25;
end;
$$;
