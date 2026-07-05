# M1 — Implementation Notes

**Milestone:** Auth (email/senha) + Onboarding + cálculo de metas
**Status:** ✅ Código completo — typecheck limpo, `next build` exit 0.
**Ação sua:** aplicar 2 migrations no Supabase (abaixo) antes de testar.

---

## O que foi construído

**Banco (`supabase/migrations/`)**
- `0001_profiles.sql` — tabela `profiles` (timezone R3, dados corporais, metas MVP, `onboarding_done`), trigger de `updated_at`, **RLS** `id = auth.uid()` em select/insert/update.
- `0002_profile_trigger.sql` — trigger `SECURITY DEFINER` que cria a linha em `profiles` ao surgir um usuário em `auth.users`.

**Auth + rotas**
- `lib/supabase/server.ts` — client server-side (`@supabase/ssr`, cookies).
- `lib/supabase/middleware.ts` + `middleware.ts` — refresh de sessão e guardas: sem sessão → `/login`; logado sem onboarding → `/onboarding`; logado + onboarding → `/` (dashboard-first, R5).
- `app/(auth)/actions.ts` — server actions `signIn`, `signUp`, `signOut`.

**Cálculo de metas**
- `lib/goals.ts` — puro/testável: **Mifflin-St Jeor** (kcal) × fator de atividade, proteína `1.8 g/kg`, água `35 ml/kg`, idade a partir da data de nascimento. Todas editáveis no onboarding.

**UI (pt-BR)**
- Primitivos `ui/button`, `ui/input`, `ui/field` (estilo shadcn, ≥44px de toque).
- `/login`, `/signup` — formulários com estado de erro.
- `/onboarding` — wizard em 3 blocos (corpo → metas com sugestão calculada e editável → hábito obrigatório); grava e marca `onboarding_done`.
- `/` — Today Dashboard (versão M1): saudação, nível base e metas do perfil + botão Sair. O loop diário completo chega no M3.

---

## Aplicar as migrations (SQL Editor)

1. Painel Supabase → **SQL Editor** → **New query**.
2. Cole o conteúdo de `supabase/migrations/0001_profiles.sql` → **Run**.
3. Nova query → cole `supabase/migrations/0002_profile_trigger.sql` → **Run**.
4. Confira em **Table Editor** que a tabela `profiles` existe com RLS habilitado.

> Ordem importa: 0001 antes de 0002.

## Configuração de Auth (importante para o teste)

- **Authentication → Providers → Email**: habilitado.
- **Authentication → Providers → Email → "Confirm email"**: para o teste privado,
  **desabilite** a confirmação por e-mail (senão o signup não cria sessão na
  hora e o app mostra "confirme seu e-mail"). Em produção, reative.
- **URL Configuration → Site URL**: `http://localhost:3000` em dev; o domínio real depois.

---

## Como testar no iPhone

1. `npm run dev` na pasta do projeto.
2. iPhone na mesma Wi-Fi → `http://<ip-do-mac>:3000` (`ipconfig getifaddr en0`).
3. Fluxo: **Criar conta** → cai no **onboarding** → preenche corpo → "Calcular sugestão" → ajusta metas → hábito → **Concluir** → cai no **Today** com suas metas.
4. Sair → **Entrar** de novo → vai direto ao Today (pula o onboarding).

## Teste de RLS (obrigatório antes do M2)

1. Crie **duas** contas (A e B), cada uma com onboarding.
2. No SQL Editor, rode como cada usuário (ou via app) e confirme que A não
   enxerga o `profiles` de B. Regra ativa: `id = auth.uid()`.

---

## Decisões

- **`useFormState`/`useFormStatus`** (react-dom) para estado de formulário sem libs extras.
- **Primitivos shadcn hand-rolled** em vez de rodar o CLI do shadcn agora — mantém o build limpo e sem dependência de registry; adotamos o shadcn completo depois se necessário.
- **Middleware consulta `onboarding_done`** a cada request protegido. Custo aceitável no MVP; se virar gargalo, movemos para claim no JWT.
- Metas são **override do usuário**: o servidor grava os valores enviados (validados > 0), não recalcula por cima.

## Pendências

- Aplicar as 2 migrations (você).
- Ajustar "Confirm email" no painel (você).
- Assets thiings `pack`, `mind`, `life_exp` seguem como placeholder até o download.
- **Próximo (M2):** Today Dashboard completo + motor de day-status.
