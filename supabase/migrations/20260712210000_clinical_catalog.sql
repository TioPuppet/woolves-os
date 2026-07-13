-- Clinica 2.0: catalogo compartilhado de medicamentos brasileiros.
-- A tabela drugs continua sendo a curadoria pessoal do profissional. Estas
-- tabelas sao somente leitura no cliente e recebem dados de fontes publicas.

create table if not exists public.clinical_drug_catalog (
  id                    bigint generated always as identity primary key,
  source_key            text not null unique,
  commercial_name       text not null,
  dcb_name              text,
  active_ingredient     text,
  regulatory_category   text,
  company_name          text,
  company_document      text,
  therapeutic_class     text,
  pharmaceutical_form   text,
  presentation          text,
  administration_route  text,
  process_number        text,
  registration_number   text,
  registration_status   text,
  registration_date     date,
  registration_expiry   date,
  search_text           text not null,
  source_name           text not null default 'ANVISA - Dados Abertos',
  source_url            text not null,
  source_version        text,
  source_updated_at     date,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists clinical_drug_catalog_status_idx
  on public.clinical_drug_catalog (registration_status);
create index if not exists clinical_drug_catalog_dcb_idx
  on public.clinical_drug_catalog (dcb_name);
create index if not exists clinical_drug_catalog_registration_idx
  on public.clinical_drug_catalog (registration_number);

-- Busca tolerante para prefixos, marcas e abreviacoes. O RPC continua
-- funcionando sem depender do cliente baixar a base completa.
create extension if not exists pg_trgm;
create index if not exists clinical_drug_catalog_search_trgm_idx
  on public.clinical_drug_catalog using gin (search_text gin_trgm_ops);

create table if not exists public.clinical_drug_documents (
  id                  bigint generated always as identity primary key,
  catalog_id          bigint not null references public.clinical_drug_catalog (id) on delete cascade,
  document_type       text not null check (document_type in ('bula_profissional', 'bula_paciente', 'registro', 'dcb')),
  document_url        text not null,
  document_hash      text,
  document_version   text,
  published_at       date,
  source_name         text not null default 'ANVISA',
  source_updated_at   date,
  unique (catalog_id, document_type, document_url)
);

create index if not exists clinical_drug_documents_catalog_idx
  on public.clinical_drug_documents (catalog_id, document_type);

create table if not exists public.clinical_drug_prices (
  id                  bigint generated always as identity primary key,
  catalog_id          bigint references public.clinical_drug_catalog (id) on delete set null,
  source_key          text not null,
  product_name        text,
  active_ingredient    text,
  presentation        text,
  pf_0                numeric,
  pmc_0               numeric,
  pmc_12              numeric,
  pmc_17              numeric,
  pmc_18              numeric,
  pmvg_0              numeric,
  source_name         text not null default 'CMED - ANVISA',
  source_version      text,
  source_updated_at   date,
  unique (source_key, source_version)
);

create index if not exists clinical_drug_prices_catalog_idx
  on public.clinical_drug_prices (catalog_id);

create table if not exists public.clinical_catalog_sync_runs (
  id                  bigint generated always as identity primary key,
  source_name         text not null,
  source_url          text not null,
  source_version      text,
  started_at           timestamptz not null default now(),
  finished_at         timestamptz,
  status               text not null check (status in ('running', 'completed', 'failed')),
  records_seen        integer not null default 0,
  records_written     integer not null default 0,
  error_message       text
);

alter table public.clinical_drug_catalog enable row level security;
alter table public.clinical_drug_documents enable row level security;
alter table public.clinical_drug_prices enable row level security;
alter table public.clinical_catalog_sync_runs enable row level security;

drop policy if exists clinical_drug_catalog_select on public.clinical_drug_catalog;
create policy clinical_drug_catalog_select on public.clinical_drug_catalog
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_clinician)
  );

drop policy if exists clinical_drug_documents_select on public.clinical_drug_documents;
create policy clinical_drug_documents_select on public.clinical_drug_documents
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_clinician)
  );

drop policy if exists clinical_drug_prices_select on public.clinical_drug_prices;
create policy clinical_drug_prices_select on public.clinical_drug_prices
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_clinician)
  );

-- O historico de sincronizacao fica reservado ao servidor/service role.
drop policy if exists clinical_catalog_sync_runs_select on public.clinical_catalog_sync_runs;

create or replace function public.search_clinical_drug_catalog(
  query text,
  max_results integer default 8
)
returns setof public.clinical_drug_catalog
language sql
stable
security definer
set search_path = public
as $$
  select c.*
    from public.clinical_drug_catalog c
   where exists (
           select 1
             from public.profiles p
            where p.id = auth.uid()
              and p.is_clinician
         )
     and lower(c.search_text) like '%' || lower(trim(query)) || '%'
   order by
     case when lower(c.registration_status) like '%valido%' then 0 else 1 end,
     case when lower(c.dcb_name) = lower(trim(query)) then 0 else 1 end,
     c.commercial_name
   limit least(greatest(coalesce(max_results, 8), 1), 50);
$$;

revoke all on function public.search_clinical_drug_catalog(text, integer) from public;
grant execute on function public.search_clinical_drug_catalog(text, integer) to authenticated;

drop trigger if exists clinical_drug_catalog_set_updated_at on public.clinical_drug_catalog;
create trigger clinical_drug_catalog_set_updated_at before update on public.clinical_drug_catalog
  for each row execute function public.set_updated_at();
