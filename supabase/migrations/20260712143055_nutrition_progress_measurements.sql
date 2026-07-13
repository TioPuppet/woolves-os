-- Nutrição · histórico de progresso e medidas corporais
-- Uma medição por usuário/dia. Campos opcionais permitem começar apenas com o peso.

create table if not exists public.nutrition_measurements (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  measured_at     date not null default current_date,
  weight_kg       numeric not null check (weight_kg > 0 and weight_kg < 500),
  body_fat_pct    numeric check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 100)),
  waist_cm        numeric check (waist_cm is null or (waist_cm > 0 and waist_cm < 300)),
  hip_cm          numeric check (hip_cm is null or (hip_cm > 0 and hip_cm < 300)),
  note            text,
  created_at      timestamptz not null default now(),
  unique (user_id, measured_at)
);

create index if not exists nutrition_measurements_user_date_idx
  on public.nutrition_measurements (user_id, measured_at desc);

alter table public.nutrition_measurements enable row level security;

drop policy if exists nutrition_measurements_select on public.nutrition_measurements;
create policy nutrition_measurements_select on public.nutrition_measurements
  for select using (user_id = auth.uid());

drop policy if exists nutrition_measurements_insert on public.nutrition_measurements;
create policy nutrition_measurements_insert on public.nutrition_measurements
  for insert with check (user_id = auth.uid());

drop policy if exists nutrition_measurements_update on public.nutrition_measurements;
create policy nutrition_measurements_update on public.nutrition_measurements
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists nutrition_measurements_delete on public.nutrition_measurements;
create policy nutrition_measurements_delete on public.nutrition_measurements
  for delete using (user_id = auth.uid());
