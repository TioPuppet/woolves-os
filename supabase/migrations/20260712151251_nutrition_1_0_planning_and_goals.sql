-- Nutrição 1.0: metas persistentes, agenda semanal e lista de compras.

create table if not exists public.nutrition_goals (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  goal_type           text not null default 'recomposition'
    check (goal_type in ('lose', 'maintain', 'gain', 'recomposition')),
  target_weight_kg    numeric check (target_weight_kg is null or (target_weight_kg > 0 and target_weight_kg < 500)),
  target_date         date,
  calorie_goal       integer check (calorie_goal is null or calorie_goal > 0),
  protein_goal_g     integer check (protein_goal_g is null or protein_goal_g > 0),
  notes               text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists nutrition_goals_one_active_idx
  on public.nutrition_goals (user_id) where is_active;

create table if not exists public.nutrition_meal_plans (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  plan_date       date not null,
  meal_type       text not null check (meal_type in ('cafe', 'almoco', 'lanche', 'jantar')),
  title           text not null,
  notes           text,
  saved_meal_id   bigint references public.meals (id) on delete set null,
  servings        numeric not null default 1 check (servings > 0 and servings <= 50),
  is_done         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, plan_date, meal_type)
);

create index if not exists nutrition_meal_plans_user_date_idx
  on public.nutrition_meal_plans (user_id, plan_date);

create table if not exists public.nutrition_shopping_items (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  quantity        numeric check (quantity is null or quantity > 0),
  unit            text,
  category        text not null default 'outros'
    check (category in ('proteinas', 'carboidratos', 'frutas', 'verduras', 'laticinios', 'despensa', 'outros')),
  source          text not null default 'manual'
    check (source in ('manual', 'plano')),
  plan_date       date,
  is_checked      boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists nutrition_shopping_items_user_idx
  on public.nutrition_shopping_items (user_id, is_checked, created_at desc);

alter table public.nutrition_goals enable row level security;
alter table public.nutrition_meal_plans enable row level security;
alter table public.nutrition_shopping_items enable row level security;

drop policy if exists nutrition_goals_all on public.nutrition_goals;
create policy nutrition_goals_all on public.nutrition_goals
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists nutrition_meal_plans_all on public.nutrition_meal_plans;
create policy nutrition_meal_plans_all on public.nutrition_meal_plans
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists nutrition_shopping_items_all on public.nutrition_shopping_items;
create policy nutrition_shopping_items_all on public.nutrition_shopping_items
  using (user_id = auth.uid()) with check (user_id = auth.uid());
