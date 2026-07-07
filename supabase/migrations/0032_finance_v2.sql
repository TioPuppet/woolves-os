-- ============================================================================
-- 0032_finance_v2.sql · Finanças v2 (mês, backdate, orçamentos, recorrentes)
-- ----------------------------------------------------------------------------
-- Adiciona visão mensal, lançamento em data passada (backdate), orçamento por
-- categoria e despesas/receitas recorrentes. Tudo com RLS por dono.
-- ============================================================================

-- 1) Backdate: log_transaction passa a aceitar uma data de referência ---------
drop function if exists public.log_transaction(text, numeric, text, text);

create or replace function public.log_transaction(
  p_type text, p_amount numeric, p_category text, p_note text,
  p_ref_date date default null
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

  v_date := coalesce(p_ref_date, public.user_local_date(v_user));
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

revoke all on function public.log_transaction(text, numeric, text, text, date) from public, anon;
grant execute on function public.log_transaction(text, numeric, text, text, date) to authenticated;

-- 2) Orçamento mensal por categoria ------------------------------------------
create table if not exists public.category_budgets (
  user_id           uuid not null references auth.users (id) on delete cascade,
  category          text not null,
  monthly_limit_brl numeric not null check (monthly_limit_brl > 0),
  updated_at        timestamptz not null default now(),
  primary key (user_id, category)
);
alter table public.category_budgets enable row level security;
drop policy if exists category_budgets_all on public.category_budgets;
create policy category_budgets_all on public.category_budgets
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Recorrentes (contas fixas / receitas fixas) -----------------------------
create table if not exists public.recurring_transactions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null check (type in ('expense', 'income')),
  amount_brl   numeric not null check (amount_brl > 0),
  category     text,
  note         text,
  day_of_month int not null default 1 check (day_of_month between 1 and 31),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists recurring_user_idx on public.recurring_transactions (user_id);
alter table public.recurring_transactions enable row level security;
drop policy if exists recurring_all on public.recurring_transactions;
create policy recurring_all on public.recurring_transactions
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Liga um lançamento à recorrência que o gerou (evita duplicar no mês).
alter table public.transactions
  add column if not exists source_recurring_id bigint
    references public.recurring_transactions (id) on delete set null;
create unique index if not exists transactions_recurring_uq
  on public.transactions (user_id, source_recurring_id, ref_date);

-- 4) apply_recurring: materializa as recorrências ativas no mês dado ----------
create or replace function public.apply_recurring(p_year int, p_month int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count int := 0;
  r public.recurring_transactions%rowtype;
  v_dim int;
  v_day int;
  v_date date;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_year is null or p_month < 1 or p_month > 12 then raise exception 'invalid month'; end if;

  v_dim := extract(day from (make_date(p_year, p_month, 1) + interval '1 month - 1 day'))::int;

  for r in select * from public.recurring_transactions
           where user_id = v_user and active loop
    v_day := least(greatest(r.day_of_month, 1), v_dim);
    v_date := make_date(p_year, p_month, v_day);
    insert into public.transactions
      (user_id, ref_date, type, amount_brl, category, note, source_recurring_id)
    values (v_user, v_date, r.type, r.amount_brl, r.category, r.note, r.id)
    on conflict (user_id, source_recurring_id, ref_date) do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.apply_recurring(int, int) from public, anon;
grant execute on function public.apply_recurring(int, int) to authenticated;
