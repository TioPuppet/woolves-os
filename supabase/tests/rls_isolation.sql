-- ============================================================================
-- rls_isolation.sql  ·  Teste de isolamento entre usuários (RLS)
-- ----------------------------------------------------------------------------
-- Objetivo: provar que, autenticado como o Usuário B, é IMPOSSÍVEL ler dados
-- do Usuário A em qualquer tabela com dados pessoais.
--
-- Por que `set role authenticated`?
--   O SQL Editor do Supabase roda como `postgres` (superusuário), que IGNORA
--   RLS. Trocar para o papel `authenticated` faz o Postgres aplicar as policies
--   exatamente como o app faria. `request.jwt.claims.sub` é o que `auth.uid()`
--   lê para identificar o usuário.
--
-- Como usar:
--   1) Crie/tenha DUAS contas. Faça login em cada uma e gere ALGUM dado no
--      Usuário A (uma nota, um cartão, uma transação, etc.).
--   2) Pegue os UUIDs:  select id, email from auth.users order by created_at;
--   3) Substitua os dois placeholders abaixo (USER_A_UUID / USER_B_UUID).
--   4) Rode o bloco inteiro. TODA linha da coluna `leaked` deve ser 0.
--   5) O segundo SELECT (opcional) confirma que o Usuário B ENXERGA os próprios
--      dados (sanity check — não deve ser tudo zero se B tiver dados).
-- ============================================================================

-- \set não está disponível no editor web; edite os dois valores diretamente:
--   USER_A_UUID  -> dono real dos dados (a "vítima")
--   USER_B_UUID  -> atacante autenticado

begin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'USER_B_UUID')::text,
  true
);

-- ---- 1) VAZAMENTO: B tentando ler dados de A. Tudo deve ser 0. -------------
select 'notes'            as tabela, count(*) as leaked from public.notes            where user_id = 'USER_A_UUID'
union all select 'kanban_cards',      count(*) from public.kanban_cards      where user_id = 'USER_A_UUID'
union all select 'kanban_lists',      count(*) from public.kanban_lists      where user_id = 'USER_A_UUID'
union all select 'transactions',      count(*) from public.transactions      where user_id = 'USER_A_UUID'
union all select 'sleep_logs',        count(*) from public.sleep_logs        where user_id = 'USER_A_UUID'
union all select 'weight_logs',       count(*) from public.weight_logs       where user_id = 'USER_A_UUID'
union all select 'water_logs',        count(*) from public.water_logs        where user_id = 'USER_A_UUID'
union all select 'habit_logs',        count(*) from public.habit_logs        where user_id = 'USER_A_UUID'
union all select 'checkins',          count(*) from public.checkins          where user_id = 'USER_A_UUID'
union all select 'meals',             count(*) from public.meals             where user_id = 'USER_A_UUID'
union all select 'workout_plans',     count(*) from public.workout_plans     where user_id = 'USER_A_UUID'
union all select 'workout_sessions',  count(*) from public.workout_sessions  where user_id = 'USER_A_UUID'
union all select 'exp_events',        count(*) from public.exp_events        where user_id = 'USER_A_UUID'
union all select 'ai_outputs',        count(*) from public.ai_outputs        where user_id = 'USER_A_UUID'
union all select 'profiles',          count(*) from public.profiles          where id      = 'USER_A_UUID'
-- Filhas (escopo herdado do pai): B não deve ver itens de A.
union all select 'meal_items',        count(*) from public.meal_items
  where meal_id in (select id from public.meals where user_id = 'USER_A_UUID')
union all select 'plan_exercises',    count(*) from public.plan_exercises
  where plan_id in (select id from public.workout_plans where user_id = 'USER_A_UUID')
union all select 'set_logs',          count(*) from public.set_logs
  where session_id in (select id from public.workout_sessions where user_id = 'USER_A_UUID')
order by tabela;

-- ---- 2) SANITY: B enxergando os PRÓPRIOS dados (não obrigatório ser >0). ---
select 'own_notes'  as tabela, count(*) as visible from public.notes         where user_id = 'USER_B_UUID'
union all select 'own_cards', count(*) from public.kanban_cards where user_id = 'USER_B_UUID'
order by tabela;

-- ---- 3) ESCRITA CRUZADA: B não pode inserir dado em nome de A. -------------
-- Deve FALHAR com "new row violates row-level security policy".
-- Descomente para testar (a transação inteira será revertida no rollback):
-- insert into public.notes (user_id, content) values ('USER_A_UUID', 'invasao');

reset role;
rollback;  -- nada é persistido; teste é não-destrutivo.
