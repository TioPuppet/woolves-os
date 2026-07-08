-- ============================================================================
-- 0035_cardio.sql · Registro de cardio (duração/distância)
-- ----------------------------------------------------------------------------
-- Exercícios do grupo "cardio" registram tempo e distância em vez de reps/kg.
-- Reaproveita set_logs (reps/load_kg ficam nulos para cardio).
-- ============================================================================

alter table public.set_logs
  add column if not exists duration_min numeric check (duration_min is null or duration_min >= 0),
  add column if not exists distance_km  numeric check (distance_km  is null or distance_km  >= 0);
