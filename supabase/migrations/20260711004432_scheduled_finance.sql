-- ============================================================================
-- 20260711004432_scheduled_finance.sql
-- Agenda financeira: contas/receitas futuras com status pendente.
-- ============================================================================

create table if not exists public.scheduled_transactions (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  due_date            date not null,
  type                text not null check (type in ('expense', 'income')),
  amount_brl          numeric not null check (amount_brl > 0),
  category            text,
  note                text,
  status              text not null default 'pending'
    check (status in ('pending', 'paid', 'canceled')),
  paid_transaction_id bigint references public.transactions (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists scheduled_transactions_user_due_idx
  on public.scheduled_transactions (user_id, due_date);

create index if not exists scheduled_transactions_user_status_due_idx
  on public.scheduled_transactions (user_id, status, due_date);

alter table public.scheduled_transactions enable row level security;

drop policy if exists scheduled_transactions_select on public.scheduled_transactions;
create policy scheduled_transactions_select on public.scheduled_transactions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists scheduled_transactions_insert on public.scheduled_transactions;
create policy scheduled_transactions_insert on public.scheduled_transactions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists scheduled_transactions_update on public.scheduled_transactions;
create policy scheduled_transactions_update on public.scheduled_transactions
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists scheduled_transactions_delete on public.scheduled_transactions;
create policy scheduled_transactions_delete on public.scheduled_transactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.touch_scheduled_transactions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists scheduled_transactions_touch_updated_at
  on public.scheduled_transactions;
create trigger scheduled_transactions_touch_updated_at
before update on public.scheduled_transactions
for each row
execute function public.touch_scheduled_transactions_updated_at();

create or replace function public.pay_scheduled_transaction(p_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_due public.scheduled_transactions%rowtype;
  v_transaction_id bigint;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select *
    into v_due
    from public.scheduled_transactions
   where id = p_id
     and user_id = v_user
   for update;

  if not found then raise exception 'scheduled transaction not found'; end if;
  if v_due.status <> 'pending' then raise exception 'scheduled transaction is not pending'; end if;

  insert into public.transactions (user_id, ref_date, type, amount_brl, category, note)
  values (
    v_user,
    v_due.due_date,
    v_due.type,
    v_due.amount_brl,
    v_due.category,
    v_due.note
  )
  returning id into v_transaction_id;

  update public.scheduled_transactions
     set status = 'paid',
         paid_transaction_id = v_transaction_id
   where id = v_due.id
     and user_id = v_user;

  return v_transaction_id;
end;
$$;

revoke all on function public.pay_scheduled_transaction(bigint) from public, anon;
grant execute on function public.pay_scheduled_transaction(bigint) to authenticated;
