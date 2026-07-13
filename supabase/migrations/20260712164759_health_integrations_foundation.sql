-- Integrações de saúde: conexões, execuções de sincronização e dados normalizados.
-- Tokens OAuth nunca são armazenados nesta tabela; ficam em um serviço server-side seguro.

create table if not exists public.health_connections (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  provider          text not null check (provider in ('apple_health', 'health_connect', 'garmin', 'withings', 'manual_import')),
  status            text not null default 'disconnected'
    check (status in ('available', 'connected', 'syncing', 'error', 'disconnected')),
  external_account_id text,
  scopes            text[] not null default '{}',
  last_synced_at    timestamptz,
  error_message     text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.health_sync_runs (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  provider          text not null check (provider in ('apple_health', 'health_connect', 'garmin', 'withings', 'manual_import')),
  status            text not null check (status in ('started', 'completed', 'failed')),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  records_imported  integer not null default 0 check (records_imported >= 0),
  error_message     text,
  metadata          jsonb not null default '{}'::jsonb
);

create table if not exists public.health_records (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  provider          text not null check (provider in ('apple_health', 'health_connect', 'garmin', 'withings', 'manual_import')),
  data_type         text not null,
  observed_at       timestamptz not null,
  value             numeric not null,
  unit              text not null,
  source_record_id  text not null,
  sync_run_id       bigint references public.health_sync_runs (id) on delete set null,
  raw_payload       jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  unique (user_id, provider, data_type, source_record_id)
);

create index if not exists health_records_user_type_date_idx
  on public.health_records (user_id, data_type, observed_at desc);
create index if not exists health_sync_runs_user_date_idx
  on public.health_sync_runs (user_id, started_at desc);

alter table public.health_connections enable row level security;
alter table public.health_sync_runs enable row level security;
alter table public.health_records enable row level security;

drop policy if exists health_connections_all on public.health_connections;
create policy health_connections_all on public.health_connections
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists health_sync_runs_all on public.health_sync_runs;
create policy health_sync_runs_all on public.health_sync_runs
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists health_records_all on public.health_records;
create policy health_records_all on public.health_records
  using (user_id = auth.uid()) with check (user_id = auth.uid());
