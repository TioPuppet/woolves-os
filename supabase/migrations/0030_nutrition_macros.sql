-- ============================================================================
-- 0030_nutrition_macros.sql · Nutrição v2 (macros completos + refeições)
-- ----------------------------------------------------------------------------
-- Adiciona carboidrato e gordura aos alimentos e aos lançamentos, organiza o
-- diário por refeição (café/almoço/jantar/lanche) e atualiza log_food para
-- computar todos os macros. Alimentos-seed antigos não têm carbo/gordura
-- (coalesce → 0); alimentos personalizados podem trazer todos os macros.
-- ============================================================================

-- 1) Macros nos alimentos (nullable — seed antigo fica sem carbo/gordura) -----
alter table public.foods
  add column if not exists carb_per_100 numeric,
  add column if not exists fat_per_100  numeric;

-- 2) Macros e refeição nos lançamentos ---------------------------------------
alter table public.food_logs
  add column if not exists carb_g numeric not null default 0,
  add column if not exists fat_g  numeric not null default 0,
  add column if not exists meal_type text not null default 'almoco'
    check (meal_type in ('cafe', 'almoco', 'jantar', 'lanche'));

-- Permite ao dono excluir um lançamento (corrigir o diário).
drop policy if exists food_logs_delete on public.food_logs;
create policy food_logs_delete on public.food_logs
  for delete using (user_id = auth.uid());

-- 3) log_food v2: recebe a refeição e grava todos os macros ------------------
drop function if exists public.log_food(bigint, numeric);

create or replace function public.log_food(
  p_food_id bigint,
  p_grams numeric,
  p_meal_type text default 'almoco'
)
returns table (
  kcal_today int, protein_today numeric, carb_today numeric, fat_today numeric,
  kcal_goal int, protein_goal int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_food public.foods%rowtype;
  v_meal text;
  v_kcal int;
  v_protein numeric;
  v_carb numeric;
  v_fat numeric;
  v_kcal_total int;
  v_protein_total numeric;
  v_carb_total numeric;
  v_fat_total numeric;
  v_kcal_goal int;
  v_protein_goal int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_grams is null or p_grams <= 0 then raise exception 'invalid grams'; end if;

  v_meal := coalesce(p_meal_type, 'almoco');
  if v_meal not in ('cafe', 'almoco', 'jantar', 'lanche') then
    v_meal := 'almoco';
  end if;

  select * into v_food from public.foods
    where id = p_food_id and (is_seed or user_id = v_user);
  if not found then raise exception 'food not found'; end if;

  v_date := public.user_local_date(v_user);
  v_kcal    := round(v_food.kcal_per_100 * p_grams / 100.0);
  v_protein := round((v_food.protein_per_100 * p_grams / 100.0)::numeric, 1);
  v_carb    := round((coalesce(v_food.carb_per_100, 0) * p_grams / 100.0)::numeric, 1);
  v_fat     := round((coalesce(v_food.fat_per_100, 0) * p_grams / 100.0)::numeric, 1);

  insert into public.food_logs
    (user_id, ref_date, food_id, grams, kcal, protein_g, carb_g, fat_g, meal_type)
  values
    (v_user, v_date, p_food_id, p_grams, v_kcal, v_protein, v_carb, v_fat, v_meal);

  select coalesce(sum(kcal), 0), coalesce(sum(protein_g), 0),
         coalesce(sum(carb_g), 0), coalesce(sum(fat_g), 0)
    into v_kcal_total, v_protein_total, v_carb_total, v_fat_total
    from public.food_logs where user_id = v_user and ref_date = v_date;

  select goal_kcal, goal_protein_g into v_kcal_goal, v_protein_goal
    from public.profiles where id = v_user;

  if v_protein_goal is not null and v_protein_total >= v_protein_goal then
    perform public._grant_exp(v_user, 'protein_target', v_date, 30);
  end if;
  if v_kcal_goal is not null
     and v_kcal_total >= round(v_kcal_goal * 0.9)
     and v_kcal_total <= round(v_kcal_goal * 1.1) then
    perform public._grant_exp(v_user, 'kcal_within_target', v_date, 20);
  end if;

  return query select v_kcal_total, v_protein_total, v_carb_total, v_fat_total,
                      v_kcal_goal, v_protein_goal;
end;
$$;

revoke all on function public.log_food(bigint, numeric, text) from public, anon;
grant execute on function public.log_food(bigint, numeric, text) to authenticated;
