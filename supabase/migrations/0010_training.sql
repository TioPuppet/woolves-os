-- M5 · 0010_training.sql
-- Shallow training: exercises, plans, sessions and set logs. RLS owner-only
-- (exercises also allow shared seed reads). Writes go through RLS/RPC.

create table if not exists public.exercises (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id) on delete cascade, -- null = seed
  name       text not null,
  is_seed    boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists exercises_seed_name_uniq
  on public.exercises (name) where is_seed;
create index if not exists exercises_user_idx on public.exercises (user_id);

create table if not exists public.workout_plans (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_exercises (
  id          bigint generated always as identity primary key,
  plan_id     bigint not null references public.workout_plans (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id),
  order_idx   int not null default 0
);

create table if not exists public.workout_sessions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  ref_date   date not null,
  plan_id    bigint references public.workout_plans (id) on delete set null,
  completed  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, ref_date);

create table if not exists public.set_logs (
  id          bigint generated always as identity primary key,
  session_id  bigint not null references public.workout_sessions (id) on delete cascade,
  exercise_id bigint not null references public.exercises (id),
  set_no      int not null,
  reps        int     check (reps is null or reps >= 0),
  load_kg     numeric check (load_kg is null or load_kg >= 0),
  rpe         numeric check (rpe is null or (rpe >= 0 and rpe <= 10)),
  created_at  timestamptz not null default now()
);
create index if not exists set_logs_session_idx on public.set_logs (session_id);
create index if not exists set_logs_exercise_idx on public.set_logs (exercise_id);

-- RLS
alter table public.exercises        enable row level security;
alter table public.workout_plans    enable row level security;
alter table public.plan_exercises   enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs         enable row level security;

drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises
  for select using (is_seed or user_id = auth.uid());
drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises
  for insert with check (user_id = auth.uid());
drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises
  for delete using (user_id = auth.uid());

drop policy if exists workout_plans_all on public.workout_plans;
create policy workout_plans_all on public.workout_plans
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists plan_exercises_all on public.plan_exercises;
create policy plan_exercises_all on public.plan_exercises
  using (exists (select 1 from public.workout_plans p
                 where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_plans p
                      where p.id = plan_id and p.user_id = auth.uid()));

drop policy if exists workout_sessions_all on public.workout_sessions;
create policy workout_sessions_all on public.workout_sessions
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists set_logs_all on public.set_logs;
create policy set_logs_all on public.set_logs
  using (exists (select 1 from public.workout_sessions s
                 where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_sessions s
                      where s.id = session_id and s.user_id = auth.uid()));
