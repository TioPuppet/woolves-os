-- M4 · 0007_nutrition.sql
-- Shallow nutrition schema: custom + seed foods, saved meals, and food logs.
-- kcal + protein focus (per PRD). RLS: owner-only, plus shared read of seed foods.

create table if not exists public.foods (
  id              bigint generated always as identity primary key,
  user_id         uuid references auth.users (id) on delete cascade,  -- null = seed
  name            text    not null,
  kcal_per_100    numeric not null check (kcal_per_100 >= 0),
  protein_per_100 numeric not null check (protein_per_100 >= 0),
  is_seed         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Idempotent seed: unique seed name so re-running the seed is a no-op.
create unique index if not exists foods_seed_name_uniq
  on public.foods (name) where is_seed;
create index if not exists foods_user_idx on public.foods (user_id);

-- Saved meals (a named group of food items).
create table if not exists public.meals (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.meal_items (
  id       bigint generated always as identity primary key,
  meal_id  bigint not null references public.meals (id) on delete cascade,
  food_id  bigint not null references public.foods (id),
  grams    numeric not null check (grams > 0)
);

-- Daily food log (denormalized kcal/protein snapshot at log time).
create table if not exists public.food_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  food_id    bigint  references public.foods (id),
  grams      numeric not null check (grams > 0),
  kcal       integer not null,
  protein_g  numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_date_idx
  on public.food_logs (user_id, ref_date);

-- RLS
alter table public.foods      enable row level security;
alter table public.meals      enable row level security;
alter table public.meal_items enable row level security;
alter table public.food_logs  enable row level security;

-- Foods: read own + shared seed; write only own.
drop policy if exists foods_select on public.foods;
create policy foods_select on public.foods
  for select using (is_seed or user_id = auth.uid());
drop policy if exists foods_insert on public.foods;
create policy foods_insert on public.foods
  for insert with check (user_id = auth.uid());
drop policy if exists foods_update on public.foods;
create policy foods_update on public.foods
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists foods_delete on public.foods;
create policy foods_delete on public.foods
  for delete using (user_id = auth.uid());

drop policy if exists meals_all on public.meals;
create policy meals_all on public.meals
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Meal items: access gated through the parent meal's ownership.
drop policy if exists meal_items_all on public.meal_items;
create policy meal_items_all on public.meal_items
  using (exists (select 1 from public.meals m
                 where m.id = meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meals m
                      where m.id = meal_id and m.user_id = auth.uid()));

drop policy if exists food_logs_select on public.food_logs;
create policy food_logs_select on public.food_logs
  for select using (user_id = auth.uid());
