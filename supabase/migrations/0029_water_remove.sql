-- ============================================================================
-- 0029_water_remove.sql · Correção de água (remover quantidade)
-- ----------------------------------------------------------------------------
-- Permite corrigir um valor digitado errado, inserindo um lançamento negativo
-- (ledger append-only), sem deixar o total do dia abaixo de zero.
-- ============================================================================

-- Permite lançamentos negativos (correções); mantém proibido o zero.
alter table public.water_logs drop constraint if exists water_logs_ml_check;
alter table public.water_logs add constraint water_logs_ml_check check (ml <> 0);

create or replace function public.remove_water(p_ml int)
returns table (total_ml int, goal_ml int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_total int;
  v_goal int;
  v_remove int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_ml is null or p_ml <= 0 then raise exception 'invalid ml'; end if;

  v_date := public.user_local_date(v_user);
  select coalesce(sum(ml), 0) into v_total
    from public.water_logs where user_id = v_user and ref_date = v_date;

  -- Nunca remove mais do que o total do dia (não deixa negativar).
  v_remove := least(p_ml, v_total);
  if v_remove > 0 then
    insert into public.water_logs (user_id, ref_date, ml)
      values (v_user, v_date, -v_remove);
  end if;

  select coalesce(sum(ml), 0) into v_total
    from public.water_logs where user_id = v_user and ref_date = v_date;
  select goal_water_ml into v_goal from public.profiles where id = v_user;

  return query select v_total, v_goal;
end;
$$;

revoke all on function public.remove_water(int) from public, anon;
grant execute on function public.remove_water(int) to authenticated;
