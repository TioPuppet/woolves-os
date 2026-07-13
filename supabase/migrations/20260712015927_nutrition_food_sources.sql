-- ============================================================================
-- 20260712015927_nutrition_food_sources.sql
-- Nutrição v3 · fontes alimentares brasileiras e metadados de qualidade
-- ----------------------------------------------------------------------------
-- Prepara a tabela de alimentos para integrar bases legais como Open Food Facts,
-- FatSecret Platform, TBCA/TACO e curadoria Woolves, sem copiar bases
-- proprietárias. Mantém compatibilidade com os alimentos atuais.
-- ============================================================================

alter table public.foods
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'user', 'woolves_seed', 'open_food_facts', 'fatsecret', 'tbca', 'taco')),
  add column if not exists external_id text,
  add column if not exists barcode text,
  add column if not exists brand text,
  add column if not exists serving_label text,
  add column if not exists source_locale text not null default 'pt-BR',
  add column if not exists source_confidence numeric not null default 0.7
    check (source_confidence >= 0 and source_confidence <= 1),
  add column if not exists verified boolean not null default false,
  add column if not exists fiber_per_100 numeric,
  add column if not exists sugar_per_100 numeric,
  add column if not exists sodium_mg_per_100 numeric,
  add column if not exists nova_group integer check (nova_group between 1 and 4),
  add column if not exists nutriscore_grade text,
  add column if not exists ingredients text,
  add column if not exists image_url text;

-- The existing seed migrations 0008, 0027 and 0031 are TACO-derived.
-- Keep that provenance visible in search so Brazilian reference data wins over
-- user-entered and external product records. Woolves-curated seeds can be
-- introduced later with source = 'woolves_seed'.
update public.foods
   set source = 'taco',
       verified = true,
       source_confidence = greatest(source_confidence, 0.98)
 where is_seed = true
   and source in ('manual', 'woolves_seed');

create index if not exists foods_barcode_idx
  on public.foods (barcode)
  where barcode is not null;

create index if not exists foods_source_external_idx
  on public.foods (source, external_id)
  where external_id is not null;

create index if not exists foods_brand_idx
  on public.foods (brand)
  where brand is not null;

create index if not exists foods_user_source_idx
  on public.foods (user_id, source);
