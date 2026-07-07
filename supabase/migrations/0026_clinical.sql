-- ============================================================================
-- 0026_clinical.sql  ·  Módulo clínico (referência profissional pessoal)
-- ----------------------------------------------------------------------------
-- ATENÇÃO / ESCOPO:
--   * Ferramenta de REFERÊNCIA para profissional de saúde. NÃO é fonte
--     primária e NÃO substitui a bula oficial nem o julgamento clínico.
--   * Todo conteúdo clínico é AUTORADO pelo próprio profissional (curadoria),
--     a partir de fontes oficiais (ANVISA / bula do profissional, openFDA).
--   * IA nunca é fonte de dose/interação/contraindicação.
--   * Acesso restrito a usuários com is_clinician = true (gate por RLS).
-- ============================================================================

-- 1) Capacidade de "clínico" no perfil ---------------------------------------
alter table public.profiles
  add column if not exists is_clinician boolean not null default false;

-- Habilita o módulo apenas para o Dr. Cleomárcio Miguel.
update public.profiles
  set is_clinician = true
  where id = '4138c1c7-fe68-4a84-8d25-987535904e7a';

-- 2) Monografias (autoria própria do profissional) ---------------------------
create table if not exists public.drugs (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null,                -- DCB / nome genérico
  brand             text,                         -- nome(s) de referência/comercial
  therapeutic_class text,
  presentation      text,                         -- apresentações
  indications       text,
  posology          text,                         -- posologia (transcrever da bula)
  contraindications text,
  adverse_reactions text,
  interactions_notes text,
  pregnancy_risk    text,                         -- categoria de risco (A/B/C/D/X)
  lactation         text,
  mechanism         text,
  source            text default 'ANVISA — Bula do Profissional',
  source_url        text,
  updated_at        timestamptz not null default now()
);
create index if not exists drugs_user_idx on public.drugs (user_id);
create index if not exists drugs_name_idx on public.drugs (user_id, name);

-- 3) Interações (curadoria — não exaustiva) ----------------------------------
create table if not exists public.drug_interactions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  drug_a      text not null,
  drug_b      text not null,
  severity    text not null check (severity in ('contraindicada', 'grave', 'moderada', 'leve')),
  effect      text,
  management  text,
  source      text,
  source_url  text,
  updated_at  timestamptz not null default now()
);
create index if not exists drug_interactions_user_idx on public.drug_interactions (user_id);

-- 4) RLS: dono + precisa ser clínico -----------------------------------------
alter table public.drugs             enable row level security;
alter table public.drug_interactions enable row level security;

drop policy if exists drugs_all on public.drugs;
create policy drugs_all on public.drugs
  using (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_clinician)
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_clinician)
  );

drop policy if exists drug_interactions_all on public.drug_interactions;
create policy drug_interactions_all on public.drug_interactions
  using (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_clinician)
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_clinician)
  );

-- Keep updated_at fresh on edits (reuses the shared trigger fn from 0001).
drop trigger if exists drugs_set_updated_at on public.drugs;
create trigger drugs_set_updated_at before update on public.drugs
  for each row execute function public.set_updated_at();

drop trigger if exists drug_interactions_set_updated_at on public.drug_interactions;
create trigger drug_interactions_set_updated_at before update on public.drug_interactions
  for each row execute function public.set_updated_at();
