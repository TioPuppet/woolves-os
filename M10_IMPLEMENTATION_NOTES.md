# M10 — Implementation Notes · Estabilização

**Status:** em andamento — segunda passada local concluída.

## O que foi ajustado

- Corrigido token visual inexistente no editor de páginas e no quadro: checkbox/progresso concluído agora usam `--status-completed`.
- Criada `supabase/migrations/0036_harden_daily_mission_rpcs.sql` para padronizar `revoke/grant execute` das RPCs de missão diária.
- Atualizado `DEPLOY.md` com migrations até `0036`.
- Alinhado `supabase/apply_pending_0028_0034.sql` com a regra atual da migration `0033` (clínica + usuário por e-mail).
- Atualizado checklist M9 com seção M10.
- Removido `src/lib/offline-queue.ts`, que estava sem uso e prometia replay offline inexistente; o app segue online-first para mutações.
- Ajustado `npm run lint` para uma checagem rígida de TypeScript não interativa enquanto o ESLint real ainda não está instalado.
- Escopados caches do TanStack Query por usuário/timezone nos fluxos principais, evitando dados antigos ao trocar contexto.
- Corrigido estado inicial do checkbox de missão no check-in ao abrir a folha.
- Fortalecido o quadro Kanban: falhas ao salvar posições agora são propagadas e o estado visual volta ao último snapshot confiável.
- Alinhado registro de assets Thiings com os PNGs realmente presentes em `public/assets/thiings`.
- Corrigido escopo dos caches de `Hoje` e `Sono` para incluir `userId` + timezone.
- Marcado `supabase/setup_all.sql` como legado, pois cobre apenas M1-M4 e não representa o schema atual.
- Adicionada guarda central para erros de leitura do Supabase; telas principais agora falham de forma visível em vez de transformar erro em lista vazia.
- Checagem estática das migrations confirmou 27 tabelas com RLS explícito.

## Validação local

- `npm run lint`
- `npm run typecheck`
- `npm test` — 46 testes.
- `npm run build`
- Smoke visual local em mobile (`390x844`) nas telas de login e cadastro, sem overflow horizontal e sem erros de console.
- Checagem estática: 27/27 tabelas criadas nas migrations com `enable row level security`.

## Ação no Supabase

Como o banco já foi aplicado até o que o Claude pediu, rode apenas:

```sql
-- supabase/migrations/0036_harden_daily_mission_rpcs.sql
revoke all on function public.set_daily_mission(text) from public, anon;
revoke all on function public.set_mission_done(boolean) from public, anon;

grant execute on function public.set_daily_mission(text) to authenticated;
grant execute on function public.set_mission_done(boolean) to authenticated;
```

## Pendências M10

- Configurar ESLint de verdade quando for possível instalar dependências (`eslint` e `eslint-config-next`). Até lá, `npm run lint` roda a guarda rígida de TypeScript.
- Rodar `supabase/tests/rls_isolation.sql` no Supabase real com duas contas.
- Confirmar rotação de qualquer chave exposta anteriormente.
