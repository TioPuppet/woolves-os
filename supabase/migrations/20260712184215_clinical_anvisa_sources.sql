-- Clinica 1.1: rastreabilidade regulatoria brasileira.
-- A fonte primaria de bulas e o Bulario Eletronico da ANVISA.
-- URLs sao referencias externas; o conteudo do Drugs.com nao e copiado.

alter table public.drugs
  add column if not exists active_ingredient text,
  add column if not exists anvisa_company text,
  add column if not exists anvisa_registration text,
  add column if not exists anvisa_published_at date,
  add column if not exists anvisa_professional_url text,
  add column if not exists anvisa_patient_url text;

create index if not exists drugs_anvisa_registration_idx
  on public.drugs (user_id, anvisa_registration);
