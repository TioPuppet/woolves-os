-- M5+ · 0014_plan_muscle_groups.sql
-- A workout plan targets one or more muscle groups (e.g. PUSH = peito, tríceps,
-- ombro). Exercises are organized under these groups in the UI.

alter table public.workout_plans
  add column if not exists muscle_groups text[] not null default '{}';
