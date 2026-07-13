-- Protocolo ampliado: composição corporal, circunferências e dobras cutâneas.
-- Todos os campos além de weight_kg são opcionais para permitir um registro
-- diário simples e uma avaliação profissional mais completa quando disponível.

alter table public.nutrition_measurements
  add column if not exists height_cm numeric check (height_cm is null or (height_cm > 50 and height_cm < 260)),
  add column if not exists body_water_pct numeric check (body_water_pct is null or (body_water_pct >= 0 and body_water_pct <= 100)),
  add column if not exists muscle_mass_kg numeric check (muscle_mass_kg is null or (muscle_mass_kg > 0 and muscle_mass_kg < 300)),
  add column if not exists bone_mass_kg numeric check (bone_mass_kg is null or (bone_mass_kg > 0 and bone_mass_kg < 30)),
  add column if not exists visceral_fat_level numeric check (visceral_fat_level is null or (visceral_fat_level >= 0 and visceral_fat_level < 100)),
  add column if not exists neck_cm numeric check (neck_cm is null or (neck_cm > 0 and neck_cm < 150)),
  add column if not exists chest_cm numeric check (chest_cm is null or (chest_cm > 0 and chest_cm < 250)),
  add column if not exists abdomen_cm numeric check (abdomen_cm is null or (abdomen_cm > 0 and abdomen_cm < 300)),
  add column if not exists right_arm_cm numeric check (right_arm_cm is null or (right_arm_cm > 0 and right_arm_cm < 150)),
  add column if not exists left_arm_cm numeric check (left_arm_cm is null or (left_arm_cm > 0 and left_arm_cm < 150)),
  add column if not exists right_thigh_cm numeric check (right_thigh_cm is null or (right_thigh_cm > 0 and right_thigh_cm < 200)),
  add column if not exists left_thigh_cm numeric check (left_thigh_cm is null or (left_thigh_cm > 0 and left_thigh_cm < 200)),
  add column if not exists right_calf_cm numeric check (right_calf_cm is null or (right_calf_cm > 0 and right_calf_cm < 120)),
  add column if not exists left_calf_cm numeric check (left_calf_cm is null or (left_calf_cm > 0 and left_calf_cm < 120)),
  add column if not exists skinfold_triceps_mm numeric check (skinfold_triceps_mm is null or (skinfold_triceps_mm > 0 and skinfold_triceps_mm < 100)),
  add column if not exists skinfold_biceps_mm numeric check (skinfold_biceps_mm is null or (skinfold_biceps_mm > 0 and skinfold_biceps_mm < 100)),
  add column if not exists skinfold_subscapular_mm numeric check (skinfold_subscapular_mm is null or (skinfold_subscapular_mm > 0 and skinfold_subscapular_mm < 100)),
  add column if not exists skinfold_suprailiac_mm numeric check (skinfold_suprailiac_mm is null or (skinfold_suprailiac_mm > 0 and skinfold_suprailiac_mm < 100)),
  add column if not exists skinfold_abdominal_mm numeric check (skinfold_abdominal_mm is null or (skinfold_abdominal_mm > 0 and skinfold_abdominal_mm < 100)),
  add column if not exists skinfold_thigh_mm numeric check (skinfold_thigh_mm is null or (skinfold_thigh_mm > 0 and skinfold_thigh_mm < 100)),
  add column if not exists skinfold_calf_mm numeric check (skinfold_calf_mm is null or (skinfold_calf_mm > 0 and skinfold_calf_mm < 100)),
  add column if not exists measurement_context text not null default 'morning'
    check (measurement_context in ('morning', 'before_training', 'after_training', 'professional', 'other')),
  add column if not exists measurement_source text not null default 'manual'
    check (measurement_source in ('manual', 'smart_scale', 'professional'));
