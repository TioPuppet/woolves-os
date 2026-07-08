-- ============================================================================
-- 0034_fix_fk_cascade.sql · Corrige exclusão de usuário no Supabase
-- ----------------------------------------------------------------------------
-- As FKs food_id/exercise_id apontavam para foods/exercises SEM ON DELETE.
-- Ao excluir um usuário, o cascade tenta remover seus alimentos/exercícios
-- personalizados, mas food_logs/set_logs ainda os referenciavam →
-- "Database error deleting user".
-- Comportamento correto:
--   food_logs.food_id          → SET NULL  (mantém o log; kcal já gravado)
--   meal_items.food_id         → CASCADE
--   plan_exercises.exercise_id → CASCADE
--   set_logs.exercise_id       → CASCADE
-- Dropamos por descoberta (independente do nome da constraint) e recriamos.
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select con.conname, con.conrelid::regclass::text as tbl
      from pg_constraint con
     where con.contype = 'f'
       and con.conrelid in (
         'public.food_logs'::regclass, 'public.meal_items'::regclass,
         'public.plan_exercises'::regclass, 'public.set_logs'::regclass)
       and con.confrelid in ('public.foods'::regclass, 'public.exercises'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.food_logs
  add constraint food_logs_food_id_fkey
  foreign key (food_id) references public.foods (id) on delete set null;

alter table public.meal_items
  add constraint meal_items_food_id_fkey
  foreign key (food_id) references public.foods (id) on delete cascade;

alter table public.plan_exercises
  add constraint plan_exercises_exercise_id_fkey
  foreign key (exercise_id) references public.exercises (id) on delete cascade;

alter table public.set_logs
  add constraint set_logs_exercise_id_fkey
  foreign key (exercise_id) references public.exercises (id) on delete cascade;
