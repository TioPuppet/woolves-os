-- M5+ · 0015_plan_exercise_prescription.sql
-- The muscle group is a property of the plan↔exercise link (where you place it),
-- not of the exercise itself — this fixes exercises landing under "Outros".
-- Plus a per-exercise prescription: target sets/reps, rest and technique.

alter table public.plan_exercises
  add column if not exists muscle_group text,
  add column if not exists target_sets  int,
  add column if not exists target_reps  text,
  add column if not exists rest_seconds int,
  add column if not exists technique    text;
