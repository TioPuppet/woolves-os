-- M5+ · 0013_exercise_muscle_group.sql
-- Muscle group tag on exercises, so each exercise shows its recruited-muscle icon.

alter table public.exercises
  add column if not exists muscle_group text;
