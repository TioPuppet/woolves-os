-- M4 · 0009_log_food.sql
-- Server-authoritative food logging (R2). Computes kcal/protein from the food
-- (seed or owned), records the log, and grants nutrition EXP when goals are met.

create or replace function public.log_food(p_food_id bigint, p_grams numeric)
returns table (kcal_today int, protein_today numeric, kcal_goal int, protein_goal int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_food public.foods%rowtype;
  v_kcal int;
  v_protein numeric;
  v_kcal_total int;
  v_protein_total numeric;
  v_kcal_goal int;
  v_protein_goal int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_grams is null or p_grams <= 0 then raise exception 'invalid grams'; end if;

  -- Food must be a shared seed or owned by the user.
  select * into v_food from public.foods
    where id = p_food_id and (is_seed or user_id = v_user);
  if not found then raise exception 'food not found'; end if;

  v_date := public.user_local_date(v_user);
  v_kcal := round(v_food.kcal_per_100 * p_grams / 100.0);
  v_protein := round((v_food.protein_per_100 * p_grams / 100.0)::numeric, 1);

  insert into public.food_logs (user_id, ref_date, food_id, grams, kcal, protein_g)
  values (v_user, v_date, p_food_id, p_grams, v_kcal, v_protein);

  select coalesce(sum(kcal), 0), coalesce(sum(protein_g), 0)
    into v_kcal_total, v_protein_total
    from public.food_logs where user_id = v_user and ref_date = v_date;

  select goal_kcal, goal_protein_g into v_kcal_goal, v_protein_goal
    from public.profiles where id = v_user;

  -- EXP: protein target (30) when reached; kcal within ±10% of goal (20).
  if v_protein_goal is not null and v_protein_total >= v_protein_goal then
    perform public._grant_exp(v_user, 'protein_target', v_date, 30);
  end if;
  if v_kcal_goal is not null
     and v_kcal_total >= round(v_kcal_goal * 0.9)
     and v_kcal_total <= round(v_kcal_goal * 1.1) then
    perform public._grant_exp(v_user, 'kcal_within_target', v_date, 20);
  end if;

  return query select v_kcal_total, v_protein_total, v_kcal_goal, v_protein_goal;
end;
$$;

revoke all on function public.log_food(bigint, numeric) from public, anon;
grant execute on function public.log_food(bigint, numeric) to authenticated;
