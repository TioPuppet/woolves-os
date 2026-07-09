-- ============================================================================
-- 0033_auth_username.sql · Login por nome de usuário
-- ----------------------------------------------------------------------------
-- Permite entrar com USUÁRIO (não e-mail). O e-mail continua sendo a identidade
-- de auth (para recuperação de senha) e é coletado só no cadastro.
-- RPCs auxiliares (executáveis por anon, pois rodam ANTES do login):
--   email_for_username  → devolve o e-mail dado o usuário (para o signInWithPassword)
--   username_available  → checa disponibilidade no cadastro
-- Nota de privacidade: email_for_username permite enumerar e-mails a partir de
-- usuários. Aceitável para este app pessoal; trocar por fluxo sem exposição
-- caso vire multi-tenant público.
-- ============================================================================

alter table public.profiles
  add column if not exists username text;
create unique index if not exists profiles_username_uq
  on public.profiles (lower(username));

-- Trigger de criação de perfil agora grava o username vindo do metadata do signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  begin
    insert into public.profiles (id, username)
    values (new.id, v_username)
    on conflict (id) do nothing;
  exception when unique_violation then
    -- usuário já em uso (corrida): cria o perfil sem username (define depois)
    insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  end;
  return new;
end;
$$;

-- Usuário → e-mail (para o login por usuário).
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email::text
    from auth.users u
    join public.profiles p on p.id = u.id
   where p.username is not null
     and lower(p.username) = lower(trim(p_username))
   limit 1;
$$;
revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- Disponibilidade de usuário (no cadastro).
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(trim(p_username))
  );
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Ativa o módulo clínico e um usuário inicial para a conta do Dr. Cleomárcio,
-- casando por E-MAIL (robusto a recriação de conta / id novo).
update public.profiles p
   set is_clinician = true,
       username = coalesce(p.username, 'cleomarcio')
  from auth.users u
 where u.id = p.id
   and u.email = 'ocleomarciomiguel@gmail.com';
