# Woolves Life OS — Checklist de Aceite (M0–M9)

_Última auditoria: M9 · QA final. Marque `[x]` ao validar cada item no ambiente de produção (Vercel + Supabase novo)._

---

## Regras invariantes (R1–R3)

- [x] **R1 — Assets de identidade só via `<ThiingsAsset>`.** Ícones de marca vêm de `/public/assets/thiings/{key}.png`. SVG inline é permitido apenas para data-viz funcional (donut de finanças, anel de sono, ícones de UI genéricos), não para identidade.
- [x] **R2 — EXP server-authoritative.** Todo ganho de EXP passa por RPC `SECURITY DEFINER` que grava no ledger append-only `exp_events` com `UNIQUE(user_id, source, ref_date)`. Cliente nunca escreve EXP direto.
- [x] **R3 — Dias locais corretos.** `lib/date.ts` (`localDayString`/`localHour`/`shiftLocalDay`) usa o timezone do perfil; `user_local_date()` no banco espelha isso. Sem bug de virada de dia por UTC.

---

## Segurança (M9.1 + M9.2)

- [x] Next.js elevado para **14.2.35** (último patch da linha 14.2); vulnerabilidades **críticas resolvidas** (7 → 2).
- [ ] _Backlog:_ migração para Next 15/16 resolve as 2 restantes (1 high / 1 moderate). São majors com breaking changes — agendar pós-MVP. Aplicabilidade real ao app é baixa (sem WebSocket upgrades, App Router e não Pages i18n, sem CSS de terceiro no build).
- [x] **RLS habilitado em 22/22 tabelas**, cada uma com policy escopada a `auth.uid()`.
- [x] Tabelas de referência (`foods`, `exercises`): `SELECT` = `is_seed or user_id=auth.uid()`; escrita restrita ao dono (seed protegido).
- [x] Tabelas-filhas (`meal_items`, `plan_exercises`, `set_logs`): propriedade herdada do pai via `EXISTS`.
- [x] Ledger/logs (`exp_events`, `water_logs`, `habit_logs`, `checkins`): só `SELECT`; escrita exclusivamente via RPC.
- [x] Todas as RPCs: `security definer` + `set search_path = public` + guarda `if v_user is null then raise` + validação de input.
- [x] Helpers internos (`_grant_exp`, `user_local_date`): `EXECUTE` revogado de `public/anon/authenticated`.
- [ ] **Rodar `supabase/tests/rls_isolation.sql`** com 2 contas reais → coluna `leaked` toda 0. _(execução manual pendente)_
- [ ] Confirmar que a `service_role key` exposta anteriormente foi **rotacionada** no Supabase.

---

## Milestones

### M0 — Fundação
- [x] Next 14 App Router + TS strict (`noUncheckedIndexedAccess`), Tailwind, TanStack Query, `@supabase/ssr`, Vitest.
- [x] Design tokens do "Wolf Design System" portados (Wolf Gold `--primary`, IA Purple `--ia`, ramp de status, `.night`, `.surface-*`, `.glass`, `.ring-gold`).
- [x] PWA: manifest + service worker.
- [x] `ThiingsAsset` + registro de chaves.

### M1 — Perfil & Onboarding
- [x] `profiles` + trigger `handle_new_user` + RLS.
- [x] Cálculo de metas (Mifflin-St Jeor) → `goal_water_ml`, proteína, calorias.
- [x] Auth + onboarding em pt-BR. Tratamento `Dr.`/`Sr.`/`Sra.`.
- [x] Middleware protege rotas autenticadas.

### M2 — Dashboard & Status do dia
- [x] `lib/day-status.ts` (motor de status) com 11 testes.
- [x] Cards do dashboard + layout "Hoje".

### M3 — Hábitos essenciais
- [x] RPCs `log_water`, `toggle_habit`, `submit_checkin`, `get_exp_total`.
- [x] UI interativa: água, hábito, check-in. Streak.

### M4 — Nutrição
- [x] Schema + **145 alimentos TACO reais** semeados.
- [x] RPC `log_food` + totais do dia. Busca de alimentos.
- [ ] _Backlog:_ completar seed (feijão/ovo/laticínios) via Open Food Facts.

### M5 — Treino
- [x] Planos reutilizáveis (templates), sessão, `set_logs`, técnicas.
- [x] Grupo muscular + prescrição (séries/reps/descanso/técnica) no `plan_exercises`.
- [x] Tela de sessão (aquecimento/trabalho) + tela motivacional de conclusão + "Realizar outro treino" dá baixa na sessão anterior.

### M6 — Finanças
- [x] `transactions` + RPCs. Tela estilo Mobills/Pierre com donut + CountUp.

### M7 — Sono & Peso
- [x] `sleep_logs`/`weight_logs` + RPCs. Tela de sono night-theme com anel animado (rAF).
- [x] Peso movido para o dashboard com seta de tendência.
- [x] Missão composta em "Hoje" (hábito · água · proteína).

### M8 — Woolves IA (Groq, gratuito)
- [x] Endpoint OpenAI-compatível Groq (`llama-3.3-70b-versatile`), server-only, com fallback.
- [x] Cache em `ai_outputs` (1 chamada por usuário+tipo+ref).
- [x] Sugestão diária no dashboard + relatório semanal em `/relatorio`.
- [ ] Configurar `GROQ_API_KEY` no ambiente de produção (Vercel).

### M8.5 — Espaço (Notion + Trello)
- [x] **Quadro (Trello):** listas horizontais criadas pelo usuário, drag & drop com toque, cartões com etiquetas/prazo/checklist, modal de detalhe.
- [x] **Páginas (Notion):** editor por blocos (texto/H1/H2/to-do/bullet), comando `/`, atalhos markdown, ícone/emoji por página.
- [x] Navegação com botão central Woolves IA + hub animado.

### M9 — QA final
- [x] Bump de segurança do Next.
- [x] Auditoria RLS completa (sem gaps).
- [x] Script de teste de isolamento (`supabase/tests/rls_isolation.sql`).
- [x] Este checklist de aceite.

---

## Qualidade / smoke test manual (produção)

- [ ] `npx tsc --noEmit` limpo (validado em dev).
- [ ] `npx vitest run` → 20/20 (validado em dev).
- [ ] `npm run build` conclui na Vercel.
- [ ] Login → onboarding → dashboard renderiza status do dia.
- [ ] Registrar água/hábito/check-in credita EXP uma única vez por dia (sem duplicação no ledger).
- [ ] Treino: iniciar, registrar séries, concluir → tela motivacional → volta ao dashboard.
- [ ] Quadro: arrastar cartão entre listas persiste após reload.
- [ ] Página: criar blocos com `/`, marcar to-do, trocar ícone → reabrir mantém o conteúdo.
- [ ] Woolves IA: sugestão diária carrega (ou cai no fallback sem quebrar).
- [ ] PWA instala e abre offline-shell.

---

## Backlog pós-MVP (registrado)

1. Migração Next 15/16 (fecha as 2 vulnerabilidades residuais).
2. Seed nutricional completo (Open Food Facts).
3. 8 ícones de rank dedicados (opcional).
4. Módulo clínico de fármacos (WhiteBook/Bulário) — **produto separado**, dados de fonte licenciada (ANVISA), IA nunca como fonte de dose/interação, gated por role. Só visível ao Dr. Cleomárcio.
5. Ordenação drag & drop também para listas (hoje só cartões).
