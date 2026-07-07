-- M8 · 0022_ai_outputs.sql
-- Cache for Woolves IA outputs (daily suggestion / weekly report), one per
-- user + kind + ref_key (local date / week-start), so Groq is called at most
-- once per period.

create table if not exists public.ai_outputs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,   -- 'daily' | 'weekly'
  ref_key    text not null,   -- local date (daily) or week-start date (weekly)
  content    text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_key)
);

alter table public.ai_outputs enable row level security;

drop policy if exists ai_outputs_all on public.ai_outputs;
create policy ai_outputs_all on public.ai_outputs
  using (user_id = auth.uid()) with check (user_id = auth.uid());
