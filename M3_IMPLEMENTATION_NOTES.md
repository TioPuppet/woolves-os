# M3 — Implementation Notes · MINIMUM LIVING LOOP

**Milestone:** hábito + água + check-in + EXP + streak + missão fixa
**Status:** ✅ Completo — 20/20 testes, typecheck limpo, `next build` exit 0.
**Migrations:** você já aplicou 0003–0006. ✔

> Este é o marco do PRD para **PARAR e usar por 3 dias reais**.

---

## O que foi construído

**Dados / lógica**
- `lib/today.ts` — snapshot do dia (água somada, hábito, check-in, EXP total,
  streak) via leituras protegidas por RLS.
- `hooks/useToday.ts` — TanStack Query com **mutações otimistas** (água, hábito)
  e check-in; invalida e reconcilia com o servidor.
- `lib/offline-queue.ts` — **fila offline (IndexedDB)** só para água/hábito (R5):
  enfileira quando offline, **drena automaticamente** ao voltar a conexão.

**UI (Cinema Mobile, guiada pelas skills)**
- `WaterCard` — +250/+500 ml em 1 toque, barra de progresso, otimista.
- `HabitCard` — toggle do hábito obrigatório com feedback imediato.
- `CheckinSheet` — bottom sheet: humor 1–5, "cumpri a missão", nota; fecha o dia.
- `TodayClient` — orquestra o loop; mostra "Dia fechado · status" após check-in.
- Polimento: glass, press-scale 0.97, entrada `rise`, acento âmbar de streak,
  `prefers-reduced-motion`, foco visível, `cursor-pointer`.

**Regra R2 preservada:** todo EXP vem do servidor (RPCs). Água atinge a meta →
+15; hábito obrigatório → +20; check-in → +25; bônus de streak +10/dia (teto
+50). O ledger é imutável — desmarcar o hábito **não** remove EXP já ganho.

**R1 preservado:** nenhum ícone de identidade fora do `ThiingsAsset`. Só glyphs
funcionais (check, X) usam SVG inline mínimo.

---

## Como testar (o loop de verdade)

1. `npm run dev` → dashboard.
2. **Água:** toque +250/+500 — a barra sobe na hora. Ao cruzar a meta, o número
   fica verde e o servidor concede +15 EXP (a barra de nível sobe após reconciliar).
3. **Hábito:** toque o card → marca como feito (+20 EXP).
4. **Check-in:** botão "Check-in da noite" → escolha humor, confirme a missão,
   nota opcional → "Fechar o dia". O card vira "Dia fechado · Concluído/Quebrado"
   e o streak incrementa.
5. **Offline:** desligue a rede (DevTools → Network → Offline), toque água/hábito
   (fica otimista), religue a rede → a fila drena sozinha e sincroniza.
6. **RLS:** repita com uma 2ª conta e confirme isolamento total dos dados.

```bash
cd ~/Desktop/Woolves-Life-OS
rm -f .git/index.lock
git add -A && git commit -m "M3: minimum living loop — water/habit/check-in, optimistic UI, offline queue, cinema-mobile polish" && git push
```

---

## Decisões

- **EXP no toque (não no check-in)** — feedback instantâneo de gamificação; a
  imutabilidade do ledger cobre o caso de desmarcar hábito.
- **Check-in é online-only** — ação deliberada de fim de dia; só água/hábito vão
  para a fila offline (conforme PRD).
- **`missionAccomplished` sugerido** no check-in = hábito feito + meta de água
  batida, mas o usuário confirma no toggle.

## Pendências / próximo

- **Baixar assets thiings** (`water, mind, mission, life_exp, trophy, pack,
  nutrition, workout, money, sleep`) — maior salto visual restante.
- **Usar por 3 dias reais** antes de avançar (recomendação do PRD).
- Depois: **M4 Nutrição** (precisa do CSV de ~200 alimentos BR — pendência sua).
