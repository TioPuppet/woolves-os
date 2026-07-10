-- M10 · Registro contextual de atividades
-- Permite que cardio, esportes e lutas guardem os dados próprios de cada modalidade.

alter table public.set_logs
  add column if not exists rounds int check (rounds is null or rounds >= 0),
  add column if not exists notes text,
  add column if not exists activity_meta jsonb not null default '{}'::jsonb;

comment on column public.set_logs.rounds is 'Rounds, blocos ou voltas da atividade quando aplicável.';
comment on column public.set_logs.notes is 'Observações livres do registro da atividade.';
comment on column public.set_logs.activity_meta is 'Métricas específicas da modalidade, reservadas para integrações futuras.';
