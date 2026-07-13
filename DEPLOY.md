# Deploy & instalação (Woolves Life OS)

Guia para publicar na Vercel e instalar como app (PWA) no iPhone.

## 1. Deploy na Vercel

1. `git push` do branch `main`.
2. Em **vercel.com** → **Add New… → Project** → importe o repositório. O Next.js é detectado sozinho.
3. **Settings → Environment Variables** (Production, Preview e Development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY` (Woolves IA)
4. **Deploy**. Gera uma URL `https://…vercel.app`.

Cada `git push` faz redeploy automático.

## 2. Banco de dados (Supabase)

A fonte oficial do schema são os arquivos individuais em `supabase/migrations/`, aplicados em ordem pelo nome. O estado atual inclui as migrations numeradas até `0037` e as migrations datadas até `20260713090000`.

Se o banco já estava aplicado até `0036`, ainda faltam estas migrations mais recentes:

```
0037_profile_avatar.sql
20260710133246_activity_details.sql
20260710202836_sleep_window.sql
20260711004432_scheduled_finance.sql
20260711015123_dream_goals.sql
20260712015927_nutrition_food_sources.sql
20260712135206_nutrition_mark_taco_sources.sql
20260712143055_nutrition_progress_measurements.sql
20260712145509_nutrition_measurement_protocol.sql
20260712151251_nutrition_1_0_planning_and_goals.sql
20260712164759_health_integrations_foundation.sql
20260712184215_clinical_anvisa_sources.sql
20260712210000_clinical_catalog.sql
20260712230000_harden_clinician_role.sql
20260713090000_workspace_focus.sql
```

O arquivo `supabase/setup_all.sql` é legado e não representa o schema atual. Não o use para substituir a sequência de migrations.

## 3. Autenticação (Supabase → Authentication)

1. **URL Configuration**: em *Site URL* e *Redirect URLs* adicione o domínio `…vercel.app` (e `.../auth/callback`). Sem isso, login por e-mail e OAuth falham.
2. **Login social (opcional)** — em *Providers*, habilite e configure cada um com as credenciais do respectivo console:
   - **Google**: Google Cloud Console → OAuth Client ID (Web). Redirect URI = `https://<seu-projeto>.supabase.co/auth/v1/callback`.
   - **Facebook**: Meta for Developers → App → Facebook Login. Mesmo redirect URI do Supabase.
   - **Discord**: Discord Developer Portal → Application → OAuth2. Mesmo redirect URI.
   Cole *Client ID* e *Secret* no provider correspondente do Supabase. Enquanto não configurar, o botão mostra "Provedor ainda não configurado".

## 4. Contas e login

- **Cadastro**: e-mail (recuperação) + **usuário** + senha.
- **Login**: pelo **usuário** (ou e-mail). O campo de senha tem botão de **ver**.
- A conta do Dr. Cleomárcio já recebe o usuário `cleomarcio` e acesso clínico na migration 0033.
- "Não foi possível criar a conta / e-mail já tem conta" → use **Entrar**.

## 5. Instalar no iPhone

1. Abra a URL no **Safari** (obrigatório — Chrome no iOS não instala PWA).
2. **Compartilhar** (quadrado com seta ↑) → **Adicionar à Tela de Início**.
3. **Adicionar**. O ícone do lobo aparece; abre em tela cheia como app.

## 6. Ícones

`public/icons/icon-192.png`, `icon-512.png` e `public/apple-touch-icon.png` (lobo sobre fundo `#0a0a0b`). Para trocar a arte, regenere a partir de `public/assets/thiings/wolf.png`.
