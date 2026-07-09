# Woolves Life OS — Build Playbook (M0 → M9)

Guia de execução passo a passo. Regra permanente: **antes de cada milestone eu
apresento o plano; depois de cada milestone entrego notas de implementação.**
UI em pt-BR · código, comentários e commits em inglês.

---

## Parte 1 — Análise das 6 skills do skills.sh

> **Contexto importante:** nesta sessão (Cowork) eu **não consigo instalar**
> skills — o cache de skills é somente leitura e a gestão fica em
> *Settings → Capabilities*. As skills abaixo são para o **seu agente de
> desenvolvimento** (Claude Code) no repositório do projeto. Instale com
> `npx skills add ...` dentro da pasta do projeto.

| Skill | Instalar? | Relevância | Sinal de segurança |
|---|---|---|---|
| **supabase-postgres-best-practices** (supabase) | ✅ Sim | Alta — RLS, schema, índices, pooling | Todos os audits **Pass** |
| **vercel-react-best-practices** (vercel-labs) | ✅ Sim | Alta — 70 regras de performance React/Next | Todos **Pass** |
| **frontend-design** (anthropics) | ✅ Sim, com trava | Média-alta — tipografia, motion, hierarquia | Todos **Pass** |
| **find-skills** (vercel-labs) | ✅ Sim | Baixa/utilitária — descobrir mais skills | Snyk **Warn** (baixo risco; é oficial Vercel) |
| **ui-ux-pro-max** (nextlevelbuilder) | ⚠️ Cautela | Média — paletas, font pairings, padrões | **Agent Trust Hub = FAIL** |
| **caveman** (juliusbrussee) | ❌ Não | Nenhuma para este projeto | Sem SKILL.md, sem audits |

### Detalhe e recomendação por skill

**supabase-postgres-best-practices — instalar.** Cobre exatamente o núcleo do
projeto: RLS, design de schema, índices, connection pooling, concorrência.
Casa com R2 (RPC/ledger) e R4 (segurança/LGPD). Invocar em **todo M com
migration ou RPC** (M1, M3, M4, M5, M6, M7, M8).

**vercel-react-best-practices — instalar.** 70 regras priorizadas por impacto
(waterfalls, bundle, re-render, hydration). Reforça R5 (UX premium mobile) e a
performance do app shell. Invocar ao escrever componentes e data fetching
(todos os milestones de UI).

**frontend-design — instalar, mas travar com R1.** Excelente para tipografia,
escala de tipos, motion e composição espacial. **Risco de conflito:** a skill
gera ilustrações/visuais próprios; **R1 proíbe** qualquer SVG de identidade ou
ícone que não seja `<ThiingsAsset>`. Uso permitido: layout, tipografia,
espaçamento, micro-interações. Uso proibido: qualquer visual de
identidade/gamificação/módulo/badge/mascote. Trate a saída dela como sugestão,
nunca deixe emitir ícones fora do ThiingsAsset.

**find-skills — instalar.** Utilitário meta: ajuda a achar skills novas quando
surgir uma necessidade (ex.: testing, PWA, charts). Snyk Warn é ruído de baixo
risco por ser CLI oficial da Vercel. Baixo custo, mantém opcional.

**ui-ux-pro-max — cautela; revisar antes de instalar.** Conteúdo rico (161
paletas, 57 pares de fontes, HIG iOS). **Porém o audit Agent Trust Hub falhou.**
Antes de instalar: (1) leia o repositório no GitHub, (2) confirme que não há
scripts/hooks executáveis suspeitos, (3) prefira rodá-la em ambiente de dev
isolado. Alternativa mais segura com escopo parecido e audit limpo:
`vercel-labs/agent-skills → web-design-guidelines` (Pass). Também há **overlap**
com frontend-design — usar as duas juntas gera ruído de direção. Escolha uma
como líder de design.

**caveman — não instalar.** É uma skill-novidade: faz o agente responder/commit
em "fala de caverna" (a irmã `caveman-commit` escreve mensagens de commit nesse
estilo). Não tem SKILL.md publicado e não passou por audits. Conflita
diretamente com a regra "commits em inglês profissional" e degradaria a
qualidade de saída de um produto premium. Sem valor técnico aqui.

### Comandos de instalação (rodar na pasta do projeto)

```bash
npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add https://github.com/vercel-labs/skills --skill find-skills
# ui-ux-pro-max: só após revisar o repo (audit Agent Trust Hub = FAIL)
# npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
```

### Skill oficial recomendada que faltava na sua lista

Para o MVP você vai querer também **shadcn** (`shadcn/ui`) — a stack fixa exige
shadcn/ui, e essa skill guia uso/customização com Tailwind. E, para o M9,
**webapp-testing** (anthropics) para os testes.

---

## Parte 2 — Protocolo permanente de execução ("sempre passo a passo")

Para **todo** milestone eu sigo, nesta ordem:

1. **Plano** — arquivos, tabelas, RPCs, políticas RLS, skills a invocar.
2. **Migrations primeiro** — SQL versionado em `supabase/migrations/`.
3. **RPCs depois** — funções `SECURITY DEFINER` para toda escrita sensível.
4. **RLS** — política `user_id = auth.uid()` em cada tabela de usuário.
5. **UI por último** — componentes, hooks TanStack Query, telas.
6. **Validação** — typecheck + build + teste manual iPhone + audit RLS.
7. **Notas de implementação** — o que foi feito, decisões, como testar,
   assets thiings pendentes.
8. **Gate de avanço** — não passo ao próximo M sem o atual validado.

Convenções fixas: dias sempre na timezone do usuário (R3); EXP só via RPC
append-only (R2); nenhum ícone de identidade fora de `<ThiingsAsset>` (R1);
todo log rápido ≤3 toques com UI otimista (R5).

---

## Parte 3 — Milestones detalhados

### M0 — Setup, PWA, tokens, ThiingsAsset ✅ (concluído)

Entregue e validado (typecheck + build exit 0). Ver `M0_IMPLEMENTATION_NOTES.md`.
Pendências antes do M1: criar projeto Supabase real e preencher `.env.local`.

---

### M1 — Auth (email/senha) + Onboarding + cálculo de metas

**Objetivo:** login funciona; onboarding calcula e salva metas; primeira ida ao
app cai no Today Dashboard.

**Skills a invocar:** supabase-postgres-best-practices (schema/RLS),
vercel-react-best-practices (forms/fetching).

**Passo a passo**

1. **Supabase Auth** — habilitar provider Email/Senha; desabilitar signups
   externos. Configurar `emailRedirectTo` para o domínio do app.
2. **Migration `0001_profiles.sql`** — tabela `profiles`:
   - `id uuid pk references auth.users on delete cascade`
   - `timezone text not null default 'America/Sao_Paulo'` (R3)
   - `display_name text`, `sex text`, `birth_date date`, `height_cm numeric`,
     `weight_kg numeric`, `activity_level text`
   - metas: `goal_kcal int`, `goal_protein_g int`, `goal_water_ml int`,
     `goal_spend_limit_brl numeric`, `required_habit text`
   - `onboarding_done boolean not null default false`
   - `created_at timestamptz default now()`
   - **RLS:** `enable row level security`; policy
     `using (id = auth.uid())` para select/insert/update.
3. **Trigger** `on auth.users insert → create profile row` (função
   `SECURITY DEFINER` que insere `profiles(id)` com defaults).
4. **Cálculo de metas (client, override permitido):**
   - kcal: **Mifflin-St Jeor** → homem `10*kg + 6.25*cm − 5*idade + 5`,
     mulher `... − 161`; multiplicar pelo fator de atividade.
   - proteína: `1.8 g/kg` (default).
   - água: `35 ml/kg`.
   - Todos exibidos com campo editável antes de salvar.
5. **Supabase server client** — `lib/supabase/server.ts` com `@supabase/ssr`
   (cookies) para Server Components e route handlers.
6. **Middleware** — proteger rotas: sem sessão → `/login`; sessão sem
   `onboarding_done` → `/onboarding`; caso contrário → `/` (Today).
7. **UI (pt-BR):** `/login`, `/signup`, `/onboarding` (wizard curto:
   dados corporais → metas calculadas/editáveis → hábito obrigatório).

**Validação:** criar conta, completar onboarding, verificar linha em
`profiles` com metas; RLS: 2ª conta não enxerga a 1ª. Typecheck + build.

**Aceitação:** login → onboarding → dashboard-first funciona.

---

### M2 — Today Dashboard (shell) + motor de day-status

**Objetivo:** dashboard renderiza cards; estado do dia é calculado de forma
determinística.

**Skills:** vercel-react-best-practices, frontend-design (layout/hierarquia),
ui-ux-pro-max *(se aprovada)*.

**Passo a passo**

1. **Sem tabelas novas** — o day-status é derivado dos logs (que chegam nos M
   seguintes); no M2 monte o **motor puro** `lib/day-status.ts` recebendo um
   snapshot do dia e retornando `on_track | at_risk | broken | recovery |
   completed` conforme a regra determinística do PRD.
2. **`lib/date.ts`** — helpers de "dia local" (R3): `localDayFor(tz, date)`,
   início/fim do dia em UTC para queries.
3. **Layout do dashboard** — header (nível/EXP/streak via ThiingsAsset), card
   de missão do dia, grade de cards de módulo (placeholders até M3+), CTA de
   check-in. Cada card com empty state e uma ação clara (R5).
4. **Hook `useToday()`** — TanStack Query agregando o snapshot do dia.
5. **Badge de status** — usar tokens `status-*` já definidos no M0.

**Validação:** alimentar o motor com snapshots fake (Vitest) cobrindo os 5
estados; conferir badge e layout no viewport iPhone.

**Aceitação:** dashboard é a primeira tela; status calcula certo para casos-teste.

---

### M3 — MINIMUM LIVING LOOP (parar aqui e usar 3 dias reais)

**Objetivo:** hábito + água + check-in + EXP + streak + missão fixa. É o loop
mínimo que já muda comportamento.

**Skills:** supabase-postgres-best-practices (RPC/ledger/RLS),
vercel-react-best-practices (UI otimista).

**Passo a passo — banco primeiro**

1. **Migration `0002_exp_ledger.sql`** (R2):
   - `exp_events (id bigserial pk, user_id uuid not null, source text not null,
     ref_date date not null, amount int not null, created_at timestamptz
     default now())`
   - `unique (user_id, source, ref_date)` — anti-farming.
   - RLS: `using (user_id = auth.uid())` **apenas SELECT**; sem INSERT direto do
     client (grava só via RPC).
2. **Migration `0003_logs_core.sql`:**
   - `water_logs (id, user_id, ref_date, ml int, created_at)`
   - `habit_logs (id, user_id, ref_date, habit_key text, done bool, created_at,
     unique(user_id, habit_key, ref_date))`
   - `checkins (id, user_id, ref_date unique-per-user, mood int check 1..5,
     note text, day_status text, created_at)`
   - RLS `user_id = auth.uid()` em todas.
3. **RPC `grant_exp(p_source text, p_ref_date date, p_amount int)`**
   `SECURITY DEFINER`: valida `auth.uid()`, faz `insert ... on conflict
   (user_id, source, ref_date) do nothing`. Nunca chamada com valores vindos
   crus do client — o `amount` vem de `exp-config.ts` **espelhado no servidor**
   (tabela de constantes ou `case` dentro da função).
4. **RPC `log_water(p_ml int)`** e **`toggle_habit(p_key text, p_done bool)`** —
   escrevem o log no dia local (R3) e chamam a lógica de EXP quando a meta é
   batida (água ≥ meta → `grant_exp('water_goal', today, 15)`).
5. **RPC `submit_checkin(p_mood int, p_note text)`** — grava check-in, calcula
   `day_status` final, concede `night_checkin` (25) e o **streak bonus**
   (`streakBonus()` espelhado no servidor), atualiza o streak.
6. **Streak** — derivar de dias consecutivos com check-in feito; guardar
   `last_checkin_date` e `current_streak` em `profiles` (atualizado só por RPC).

**Passo a passo — UI**

7. **Missão fixa do dia** — determinística a partir da meta obrigatória (ex.:
   "Beba {meta} de água + cumpra {hábito}"). Sem IA ainda.
8. **Quick logs ≤3 toques** — botão de água (+250/+500 ml) e toggle de hábito,
   com **mutação otimista** e rollback em erro.
9. **Online-first para mutações** — manter água/hábito com UI otimista e
   rollback/reconciliação em erro. A fila offline antiga foi removida no M10.
10. **Night check-in** — sheet com mood 1–5 + nota; fecha o dia e mostra EXP
    ganho + status final.

**Validação:** logar água/hábito, ver EXP subir uma única vez por fonte/dia
(testar idempotência do `unique`); check-in fecha o dia; streak incrementa em
dias consecutivos; offline → volta → drena. RLS com 2ª conta.

**Aceitação:** loop completo em ≤15s por log. **PARE e use por 3 dias reais.**

---

### M4 — Nutrição (rasa)

**Objetivo:** foco kcal + proteína; alimentos próprios, refeições salvas, seed
~200 itens BR.

**Skills:** supabase-postgres-best-practices, vercel-react-best-practices.

**Passo a passo**

1. **Migration `0004_nutrition.sql`:**
   - `foods (id, user_id nullable, name, kcal_per_100 numeric, protein_per_100
     numeric, is_seed bool default false)`
   - `meals (id, user_id, name)` + `meal_items (meal_id, food_id, grams)`
   - `food_logs (id, user_id, ref_date, food_id, grams, kcal int, protein_g
     numeric, created_at)`
   - RLS: `user_id = auth.uid()` ou `is_seed = true` (leitura do seed compartilhado).
2. **Seed `0005_seed_foods_br.sql`** — ~200 alimentos brasileiros comuns
   (arroz, feijão, ovo, frango, etc.) com kcal/proteína por 100 g.
   *(Fonte de dados a confirmar com você; não invento valores nutricionais —
   marco como pendência de dados.)*
3. **RPCs** `log_food(p_food_id, p_grams)` calculando kcal/proteína; ao cruzar
   metas → `grant_exp('protein_target'|'kcal_within_target', ...)`.
4. **UI:** busca de alimento, quantidade em gramas, refeições salvas de 1 toque,
   barras de kcal/proteína do dia.

**Validação:** somatórios do dia corretos; EXP de proteína/kcal só 1x/dia.
**Aceitação:** registrar refeição em poucos toques; metas refletem no status.

---

### M5 — Treino (raso)

**Objetivo:** CRUD de plano; log de sessão (séries/reps/carga/RPE); última
performance visível.

**Passo a passo**

1. **Migration `0006_training.sql`:**
   - `exercises (id, user_id nullable, name, is_seed bool)`
   - `plans (id, user_id, name)` + `plan_exercises (plan_id, exercise_id, order)`
   - `workout_sessions (id, user_id, ref_date, plan_id, completed bool)`
   - `set_logs (id, session_id, exercise_id, set_no, reps, load_kg, rpe)`
   - RLS por `user_id`.
2. **RPC `complete_session(p_session_id)`** → `grant_exp('workout_completed',
   today, 50)`.
3. **"Última performance"** — query da sessão anterior por exercício, exibida
   inline no log.
4. **UI:** criar/editar plano; tela de execução com incremento rápido de
   reps/carga/RPE.

**Validação:** last-performance correta; EXP de treino 1x/dia.
**Aceitação:** logar sessão completa; card de treino reflete no dashboard.

---

### M6 — Finanças (raso)

**Objetivo:** despesa/receita, chips de categoria, status do limite diário.

**Passo a passo**

1. **Migration `0007_finance.sql`** (tabela **separada** de saúde, R4):
   - `transactions (id, user_id, ref_date, type text check in
     ('expense','income'), amount_brl numeric, category text, note,
     created_at)`
   - RLS por `user_id`.
2. **Status do limite** — somatório de despesas do dia vs
   `goal_spend_limit_brl`; alimenta `at_risk` (>80%) e `broken` (estourou).
3. **RPC** para conceder `spend_within_limit` (25) no fechamento do dia se
   dentro do limite (integra ao check-in do M3).
4. **UI:** entrada rápida (valor + chip de categoria), barra do limite diário.

**Validação:** limite reflete no day-status; EXP de gasto só no fechamento.
**Aceitação:** registrar despesa em ≤3 toques; status muda conforme o limite.

---

### M7 — Sono + peso + status composto + missões compostas

**Objetivo:** completar os quick logs e integrar todos os sinais no day-status.

**Passo a passo**

1. **Migration `0008_sleep_weight.sql`:**
   - `sleep_logs (id, user_id, ref_date, hours numeric, created_at)`
   - `weight_logs (id, user_id, ref_date, kg numeric, created_at)`
   - RLS por `user_id`.
2. **RPCs** de sono (meta batida → `sleep_goal` 15) e peso.
3. **Day-status composto** — o motor do M2 agora consome nutrição, treino,
   finanças, água, sono; regras `at_risk`/`broken`/`recovery` completas.
4. **Missão de recuperação** — no dia após `broken`, missão reduzida (R do PRD).
5. **Missões compostas** — combinar 2–3 alvos (ex.: proteína + água + hábito).

**Validação:** simular sequência broken→recovery; conferir missão reduzida.
**Aceitação:** status reflete o dia inteiro; missões compostas completáveis.

---

### M8 — Relatório semanal (IA) + sugestão diária

**Objetivo:** 1 Edge Function chamando Anthropic (claude-sonnet-4-6) para o
relatório semanal e 1 sugestão diária. Sem chat.

**Skills:** supabase-postgres-best-practices (Edge Function/segurança).

**Passo a passo**

1. **Edge Function `weekly-report`** — agrega os dados dos últimos 7 dias
   (server-side, respeitando RLS via service role só dentro da função),
   monta prompt, chama Anthropic com `ANTHROPIC_API_KEY` (server-only, R4),
   retorna markdown estruturado. **Nenhum segredo no client.**
2. **Migration `0009_reports.sql`** — `weekly_reports (id, user_id, week_start,
   content, created_at)`; cache do resultado.
3. **Sugestão diária** — mesma função ou uma leve, gera 1 dica baseada no
   snapshot do dia; exibida no card `ai_coach` (ThiingsAsset).
4. **UI:** tela de relatório (render do markdown) + card de sugestão no
   dashboard.

**Validação:** função retorna com dados reais de uma semana de teste;
tratar erro/timeout da API com fallback amigável.
**Aceitação:** relatório semanal renderiza; sugestão diária aparece.

---

### M9 — QA mobile/desktop, auditoria RLS, teste privado 14 dias

**Objetivo:** produto pronto para o teste fechado com 3 fundadores.

**Skills:** webapp-testing (anthropics), supabase-postgres-best-practices.

**Passo a passo**

1. **Auditoria RLS** — script que tenta ler/escrever cada tabela com uma 2ª
   conta e confirma bloqueio; revisar toda policy.
2. **QA** — checklist de aceitação do PRD em iPhone real + desktop; medir
   ≤3 toques / ≤15s por log; instalar como PWA e testar offline.
3. **Testes** — unit para `exp-config`, `day-status`, `date`; e2e do loop
   (login → log → check-in).
4. **Assets thiings** — confirmar que todas as 14 keys têm PNG real; zero
   placeholder em produção.
5. **Teste privado 14 dias** — 3 usuários fundadores; coletar feedback.

**Aceitação (MVP done):** todos os critérios do PRD batidos; RLS verificado com
2ª conta; zero ícone de identidade fora do ThiingsAsset; instala e funciona bem
como PWA no iPhone.

---

## Parte 4 — Checklist de assets thiings (para você baixar)

Módulos/identidade: `body, money, mission, mind, pack, ai_coach, life_exp,
alpha_badge, trophy`. Quick logs: `water, sleep, workout, nutrition`. Mais os
ícones PWA reais (`/public/icons/icon-192.png`, `icon-512.png`). Solte os PNGs
em `/public/assets/thiings/` com o nome exato da key.

---

## Pendências que dependem de você (sinalizadas, não inventadas)

1. **Credenciais Supabase** — criar projeto e preencher `.env.local` (antes do M1).
2. **Dados nutricionais do seed BR (~200 itens)** — não invento valores de
   kcal/proteína; preciso de uma fonte confiável ou da sua planilha (para o M4).
3. **`ANTHROPIC_API_KEY`** — para o M8 (guardar server-side na Edge Function).
4. **Decisão de design lead** — frontend-design *ou* ui-ux-pro-max como guia
   principal (evitar usar as duas e gerar direção conflitante).
