-- M6 · 0018_finance.sql
-- Shallow finance: expense/income with category. Separate from health (R4).

create table if not exists public.transactions (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  type       text    not null check (type in ('expense', 'income')),
  amount_brl numeric not null check (amount_brl > 0),
  category   text,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, ref_date);

alter table public.transactions enable row level security;

drop policy if exists transactions_all on public.transactions;
create policy transactions_all on public.transactions
  using (user_id = auth.uid()) with check (user_id = auth.uid());
