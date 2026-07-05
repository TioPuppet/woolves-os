-- Woolves Life OS — full schema setup (M1–M4).
-- Auto-generated: concatenation of migrations 0001–0008 in order.
-- Run once on a FRESH Supabase project's SQL Editor.


-- ============================================================
-- migrations/0001_profiles.sql
-- ============================================================
-- M1 · 0001_profiles.sql
-- User profile: timezone (R3), body metrics, and MVP goals.
-- RLS (R4): a user can only see/modify their own row.

create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  -- R3: all "day" logic uses this timezone, never raw UTC.
  timezone              text    not null default 'America/Sao_Paulo',
  display_name          text,
  sex                   text    check (sex in ('male', 'female')),
  birth_date            date,
  height_cm             numeric check (height_cm is null or height_cm > 0),
  weight_kg             numeric check (weight_kg is null or weight_kg > 0),
  activity_level        text    check (activity_level in
                          ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  -- MVP goals (all user-overridable during onboarding).
  goal_kcal             integer check (goal_kcal is null or goal_kcal > 0),
  goal_protein_g        integer check (goal_protein_g is null or goal_protein_g > 0),
  goal_water_ml         integer check (goal_water_ml is null or goal_water_ml > 0),
  goal_spend_limit_brl  numeric check (goal_spend_limit_brl is null or goal_spend_limit_brl >= 0),
  required_habit        text,
  onboarding_done       boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Keep updated_at fresh on any change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS (R4)
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());


-- ============================================================
-- migrations/0002_profile_trigger.sql
-- ============================================================
-- M1 · 0002_profile_trigger.sql
-- Auto-create a profile row when a new auth user signs up.
-- SECURITY DEFINER so the insert runs with owner privileges (bypasses RLS for
-- this single controlled insert); search_path pinned to public for safety.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- migrations/0003_exp_ledger.sql
-- ============================================================
-- M3 · 0003_exp_ledger.sql
-- R2 — server-authoritative, append-only EXP ledger.
-- Writes happen ONLY via SECURITY DEFINER RPCs (0006). No client insert policy.
-- UNIQUE(user_id, source, ref_date) prevents farming (one grant per source/day).

create table if not exists public.exp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  source     text    not null,
  ref_date   date    not null,
  amount     integer not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, source, ref_date)
);

create index if not exists exp_events_user_date_idx
  on public.exp_events (user_id, ref_date);

alter table public.exp_events enable row level security;

-- Read-only for the owner; there is intentionally NO insert/update/delete policy.
drop policy if exists exp_events_select_own on public.exp_events;
create policy exp_events_select_own on public.exp_events
  for select using (user_id = auth.uid());


-- ============================================================
-- migrations/0004_logs_core.sql
-- ============================================================
-- M3 · 0004_logs_core.sql
-- Core daily logs: water (accumulating), required/optional habits, night check-in.
-- RLS: owner-only. Writes go through RPCs (0006), but owner SELECT is allowed so
-- the client can read today's totals for optimistic UI.

-- Water: one row per pour; summed per local day.
create table if not exists public.water_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  ml         integer not null check (ml > 0),
  created_at timestamptz not null default now()
);
create index if not exists water_logs_user_date_idx
  on public.water_logs (user_id, ref_date);

-- Habits: one row per habit_key per local day ('required' = the required habit).
create table if not exists public.habit_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  habit_key  text    not null,
  done       boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, habit_key, ref_date)
);

-- Night check-in: one per local day, closes the day.
create table if not exists public.checkins (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  ref_date   date    not null,
  mood       integer not null check (mood between 1 and 5),
  note       text,
  day_status text    not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref_date)
);

-- RLS
alter table public.water_logs enable row level security;
alter table public.habit_logs enable row level security;
alter table public.checkins   enable row level security;

drop policy if exists water_logs_select_own on public.water_logs;
create policy water_logs_select_own on public.water_logs
  for select using (user_id = auth.uid());

drop policy if exists habit_logs_select_own on public.habit_logs;
create policy habit_logs_select_own on public.habit_logs
  for select using (user_id = auth.uid());

drop policy if exists checkins_select_own on public.checkins;
create policy checkins_select_own on public.checkins
  for select using (user_id = auth.uid());


-- ============================================================
-- migrations/0005_streak_columns.sql
-- ============================================================
-- M3 · 0005_streak_columns.sql
-- Streak state on the profile. Updated ONLY by the submit_checkin RPC (0006).

alter table public.profiles
  add column if not exists current_streak   integer not null default 0,
  add column if not exists last_checkin_date date;


-- ============================================================
-- migrations/0006_rpcs.sql
-- ============================================================
-- M3 · 0006_rpcs.sql
-- Server-authoritative mutations (R2). All are SECURITY DEFINER with a pinned
-- search_path. EXP amounts are hard-coded here (mirrors exp-config.ts) so the
-- client can never set them. Internal helpers are revoked from all client roles.

-- ── Internal helper: user's local calendar date (R3) ──────────────────────────
create or replace function public.user_local_date(p_user uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_user),
    'America/Sao_Paulo'
  ))::date;
$$;

-- ── Internal helper: append an EXP grant (idempotent per source/day) ──────────
create or replace function public._grant_exp(
  p_user uuid, p_source text, p_ref date, p_amount int
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.exp_events (user_id, source, ref_date, amount)
  values (p_user, p_source, p_ref, p_amount)
  on conflict (user_id, source, ref_date) do nothing;
$$;

-- Helpers must never be callable directly by clients.
revoke all on function public.user_local_date(uuid) from public, anon, authenticated;
revoke all on function public._grant_exp(uuid, text, date, int) from public, anon, authenticated;

-- ── log_water: add a pour, grant water_goal EXP when the goal is reached ──────
create or replace function public.log_water(p_ml int)
returns table (total_ml int, goal_ml int, exp_awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_total int;
  v_goal int;
  v_awarded boolean := false;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_ml is null or p_ml <= 0 then raise exception 'invalid ml'; end if;

  v_date := public.user_local_date(v_user);
  insert into public.water_logs (user_id, ref_date, ml) values (v_user, v_date, p_ml);

  select coalesce(sum(ml), 0) into v_total
    from public.water_logs where user_id = v_user and ref_date = v_date;
  select goal_water_ml into v_goal from public.profiles where id = v_user;

  if v_goal is not null and v_total >= v_goal then
    perform public._grant_exp(v_user, 'water_goal', v_date, 15);
    v_awarded := true;
  end if;

  return query select v_total, v_goal, v_awarded;
end;
$$;

-- ── toggle_habit: mark a habit done/undone; grant required_habit EXP on done ──
-- The ledger is immutable (R2): toggling off never revokes an already-earned
-- grant; the UNIQUE constraint prevents re-granting the same day.
create or replace function public.toggle_habit(p_key text, p_done boolean)
returns table (exp_awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date;
  v_key text := coalesce(nullif(trim(p_key), ''), 'required');
  v_awarded boolean := false;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  v_date := public.user_local_date(v_user);

  insert into public.habit_logs (user_id, ref_date, habit_key, done)
  values (v_user, v_date, v_key, coalesce(p_done, true))
  on conflict (user_id, habit_key, ref_date)
    do update set done = excluded.done;

  if coalesce(p_done, true) and v_key = 'required' then
    perform public._grant_exp(v_user, 'required_habit', v_date, 20);
    v_awarded := true;
  end if;

  return query select v_awarded;
end;
$$;

-- ── submit_checkin: close the day, set status, update streak, grant EXP ───────
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
    v_streak := coalesce(v_streak, 0);            -- already checked in today
  elsif v_prev = (v_date - 1) then
    v_streak := coalesce(v_streak, 0) + 1;        -- consecutive day
  else
    v_streak := 1;                                -- streak reset / first day
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
  v_bonus := least(v_streak * 10, 50);            -- +10/day capped at +50
  if v_bonus > 0 then
    perform public._grant_exp(v_user, 'streak_bonus', v_date, v_bonus);
  end if;

  return query select v_status, v_streak, 25;
end;
$$;

-- ── get_exp_total: cumulative EXP for the current user ────────────────────────
create or replace function public.get_exp_total()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::int
    from public.exp_events where user_id = auth.uid();
$$;

-- Expose only the public RPCs to authenticated users.
revoke all on function public.log_water(int)                 from public, anon;
revoke all on function public.toggle_habit(text, boolean)    from public, anon;
revoke all on function public.submit_checkin(int, text, boolean) from public, anon;
revoke all on function public.get_exp_total()                from public, anon;

grant execute on function public.log_water(int)                 to authenticated;
grant execute on function public.toggle_habit(text, boolean)    to authenticated;
grant execute on function public.submit_checkin(int, text, boolean) to authenticated;
grant execute on function public.get_exp_total()                to authenticated;


-- ============================================================
-- migrations/0007_nutrition.sql
-- ============================================================
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


-- ============================================================
-- migrations/0008_seed_foods_br.sql
-- ============================================================
-- M4 · 0008_seed_foods_br.sql
-- Brazilian food seed from TACO (Tabela Brasileira de Composição de Alimentos,
-- NEPA/UNICAMP, 4th ed.), values per 100 g. Shared read-only seed (is_seed = true).
-- Source data: github.com/raulfdm/taco-api (references/csv).
-- Branded/packaged BR products can be layered later from Open Food Facts (ODbL).

insert into public.foods (name, kcal_per_100, protein_per_100, is_seed) values
  ('Abacate, cru', 96, 1.2, true),
  ('Abacaxi, cru', 48, 0.9, true),
  ('Abobrinha, italiana, cozida', 15, 1.1, true),
  ('Abobrinha, italiana, crua', 19, 1.1, true),
  ('Abóbora, cabotian, cozida', 48, 1.4, true),
  ('Abóbora, cabotian, crua', 39, 1.7, true),
  ('Acelga, crua', 21, 1.4, true),
  ('Acerola, crua', 33, 0.9, true),
  ('Agrião, cru', 17, 2.7, true),
  ('Alface, americana, crua', 9, 0.6, true),
  ('Alface, crespa, crua', 11, 1.3, true),
  ('Alho, cru', 113, 7.0, true),
  ('Ameixa, crua', 53, 0.8, true),
  ('Apresuntado', 129, 13.5, true),
  ('Arroz, integral, cozido', 124, 2.6, true),
  ('Arroz, integral, cru', 360, 7.3, true),
  ('Arroz, tipo 1, cozido', 128, 2.5, true),
  ('Arroz, tipo 1, cru', 358, 7.2, true),
  ('Arroz, tipo 2, cozido', 130, 2.6, true),
  ('Arroz, tipo 2, cru', 358, 7.2, true),
  ('Atum, conserva em óleo', 166, 26.2, true),
  ('Atum, fresco, cru', 118, 25.7, true),
  ('Aveia, flocos, crua', 394, 13.9, true),
  ('Bacalhau, salgado, cru', 136, 29.0, true),
  ('Banana, da terra, crua', 128, 1.4, true),
  ('Banana, maçã, crua', 87, 1.8, true),
  ('Banana, nanica, crua', 92, 1.4, true),
  ('Banana, prata, crua', 98, 1.3, true),
  ('Batata, baroa, cozida', 80, 0.9, true),
  ('Batata, doce, cozida', 77, 0.6, true),
  ('Batata, doce, crua', 118, 1.3, true),
  ('Batata, inglesa, cozida', 52, 1.2, true),
  ('Batata, inglesa, crua', 64, 1.8, true),
  ('Batata, inglesa, frita', 267, 5.0, true),
  ('Berinjela, cozida', 19, 0.7, true),
  ('Berinjela, crua', 20, 1.2, true),
  ('Beterraba, cozida', 32, 1.3, true),
  ('Beterraba, crua', 49, 1.9, true),
  ('Biscoito, doce, maisena', 443, 8.1, true),
  ('Biscoito, doce, recheado com chocolate', 472, 6.4, true),
  ('Biscoito, doce, recheado com morango', 471, 5.7, true),
  ('Biscoito, salgado, cream cracker', 432, 10.1, true),
  ('Bolo, pronto, chocolate', 410, 6.2, true),
  ('Brócolis, cozido', 25, 2.1, true),
  ('Brócolis, cru', 25, 3.6, true),
  ('Caju, cru', 43, 1.0, true),
  ('Camarão, Rio Grande, grande, cozido', 90, 19.0, true),
  ('Camarão, Rio Grande, grande, cru', 47, 10.0, true),
  ('Canjica, branca, crua', 358, 7.2, true),
  ('Caqui, chocolate, cru', 71, 0.4, true),
  ('Carambola, crua', 46, 0.9, true),
  ('Carne, bovina, acém, moído, cozido', 212, 26.7, true),
  ('Carne, bovina, acém, moído, cru', 137, 19.4, true),
  ('Carne, bovina, charque, cozido', 263, 36.4, true),
  ('Carne, bovina, contra-filé, com gordura, grelhado', 278, 32.4, true),
  ('Carne, bovina, contra-filé, sem gordura, grelhado', 194, 35.9, true),
  ('Carne, bovina, contra-filé, à milanesa', 352, 20.6, true),
  ('Carne, bovina, costela, assada', 373, 28.8, true),
  ('Carne, bovina, coxão mole, sem gordura, cozido', 219, 32.4, true),
  ('Carne, bovina, filé mingnon, sem gordura, cru', 143, 21.6, true),
  ('Carne, bovina, filé mingnon, sem gordura, grelhado', 220, 32.8, true),
  ('Carne, bovina, fígado, cru', 141, 20.7, true),
  ('Carne, bovina, fígado, grelhado', 225, 29.9, true),
  ('Carne, bovina, lagarto, cozido', 222, 32.9, true),
  ('Carne, bovina, maminha, grelhada', 153, 30.7, true),
  ('Carne, bovina, miolo de alcatra, sem gordura, grelhado', 241, 31.9, true),
  ('Carne, bovina, músculo, sem gordura, cru', 142, 21.6, true),
  ('Carne, bovina, patinho, sem gordura, grelhado', 219, 35.9, true),
  ('Carne, bovina, picanha, com gordura, grelhada', 289, 26.4, true),
  ('Carne, bovina, picanha, sem gordura, grelhada', 238, 31.9, true),
  ('Carne, bovina, seca, cozida', 313, 26.9, true),
  ('Cebola, crua', 39, 1.7, true),
  ('Cenoura, cozida', 30, 0.8, true),
  ('Cenoura, crua', 34, 1.3, true),
  ('Cereais, milho, flocos, com sal', 370, 7.3, true),
  ('Cereal matinal, milho', 365, 7.2, true),
  ('Chuchu, cozido', 19, 0.4, true),
  ('Chuchu, cru', 17, 0.7, true),
  ('Couve, manteiga, crua', 27, 2.9, true),
  ('Couve-flor, cozida', 19, 1.2, true),
  ('Couve-flor, crua', 23, 1.9, true),
  ('Coxinha de frango, frita', 283, 9.6, true),
  ('Farinha, de mandioca, crua', 361, 1.6, true),
  ('Farinha, de milho, amarela', 351, 7.2, true),
  ('Farinha, de trigo', 360, 9.8, true),
  ('Figo, cru', 41, 1.0, true),
  ('Goiaba, branca, com casca, crua', 52, 0.9, true),
  ('Goiaba, vermelha, com casca, crua', 54, 1.1, true),
  ('Graviola, crua', 62, 0.8, true),
  ('Jabuticaba, crua', 58, 0.6, true),
  ('Jaca, crua', 88, 1.4, true),
  ('Kiwi, cru', 51, 1.3, true),
  ('Laranja, baía, crua', 45, 1.0, true),
  ('Laranja, pêra, crua', 37, 1.0, true),
  ('Limão, tahiti, cru', 32, 0.9, true),
  ('Macarrão, trigo, cru', 371, 10.0, true),
  ('Mamão, Formosa, cru', 45, 0.8, true),
  ('Mamão, Papaia, cru', 40, 0.5, true),
  ('Mandioca, cozida', 125, 0.6, true),
  ('Mandioca, crua', 151, 1.1, true),
  ('Manga, Haden, crua', 64, 0.4, true),
  ('Manga, Tommy Atkins, crua', 51, 0.9, true),
  ('Manteiga, com sal', 726, 0.4, true),
  ('Manteiga, sem sal', 758, 0.4, true),
  ('Maracujá, cru', 68, 2.0, true),
  ('Maçã, Argentina, com casca, crua', 63, 0.2, true),
  ('Maçã, Fuji, com casca, crua', 56, 0.3, true),
  ('Melancia, crua', 33, 0.9, true),
  ('Melão, cru', 29, 0.7, true),
  ('Merluza, filé, assado', 122, 26.6, true),
  ('Merluza, filé, cru', 89, 16.6, true),
  ('Mexerica, Murcote, crua', 58, 0.9, true),
  ('Milho, fubá, cru', 353, 7.2, true),
  ('Milho, verde, cru', 138, 6.6, true),
  ('Morango, cru', 30, 0.9, true),
  ('Pepino, cru', 10, 0.9, true),
  ('Pescada, filé, cru', 107, 16.7, true),
  ('Pimentão, amarelo, cru', 28, 1.2, true),
  ('Pimentão, verde, cru', 21, 1.1, true),
  ('Pinha, crua', 88, 1.5, true),
  ('Pipoca, com óleo de soja, sem sal', 448, 9.9, true),
  ('Pitanga, crua', 41, 0.9, true),
  ('Pão, aveia, forma', 343, 12.4, true),
  ('Pão, trigo, forma, integral', 253, 9.4, true),
  ('Pão, trigo, francês', 300, 8.0, true),
  ('Pêra, Park, crua', 61, 0.2, true),
  ('Pêssego, Aurora, cru', 36, 0.8, true),
  ('Quiabo, cru', 30, 1.9, true),
  ('Repolho, branco, cru', 17, 0.9, true),
  ('Romã, crua', 56, 0.4, true),
  ('Rúcula, crua', 13, 1.8, true),
  ('Salmão, filé, com pele, fresco, grelhado', 229, 23.9, true),
  ('Salmão, sem pele, fresco, cru', 170, 19.3, true),
  ('Salmão, sem pele, fresco, grelhado', 243, 26.1, true),
  ('Salsa, crua', 33, 3.3, true),
  ('Sardinha, assada', 164, 32.2, true),
  ('Sardinha, conserva em óleo', 285, 15.9, true),
  ('Sardinha, inteira, crua', 114, 21.1, true),
  ('Tangerina, Poncã, crua', 38, 0.8, true),
  ('Tomate, com semente, cru', 15, 1.1, true),
  ('Tomate, salada', 21, 0.8, true),
  ('Torrada, pão francês', 377, 10.5, true),
  ('Uva, Itália, crua', 53, 0.7, true),
  ('Uva, Rubi, crua', 49, 0.6, true),
  ('Vagem, crua', 25, 1.8, true)
on conflict do nothing;

