# M2 — Implementation Notes

**Milestone:** Today Dashboard shell + day-status engine + card layout
**Status:** ✅ Completo — 15/15 testes passando, typecheck limpo, `next build` exit 0.
**Ação sua:** nenhuma no banco (M2 não tem migration). Só commitar e testar visual.

---

## O que foi construído

**Lógica (pura, testável)**
- `lib/date.ts` — R3: dia local por timezone (`localDayString`, `localHour`,
  `shiftLocalDay`, `isConsecutiveDay`). Base para streak/missão/status.
- `lib/day-status.ts` — motor determinístico `computeDayStatus(snapshot)` →
  `on_track | at_risk | broken | recovery | completed`, com precedência
  completed → broken → recovery → at_risk → on_track. Limiares centralizados
  (`DAY_STATUS_THRESHOLDS`: gasto ≥80% = risco; noite ≥18h com proteína <60% =
  risco). Metadados pt-BR + token de cor em `DAY_STATUS_META`.

**UI**
- `components/dashboard/StatusBadge.tsx` — pílula colorida por status (mapa de
  classes estático para o Tailwind manter no build).
- `components/dashboard/LevelHeader.tsx` — saudação, nível/EXP com barra, streak.
- `components/dashboard/MissionCard.tsx` — missão do dia + badge de status.
- `components/dashboard/ModuleCard.tsx` — tile de módulo; todo empty state mostra
  uma ação clara (R5).
- `app/page.tsx` — Today Dashboard montado: header, missão, grade de 4 módulos
  (água, nutrição, treino, finanças) e CTA de check-in.

**Testes (Vitest)**
- `lib/day-status.test.ts` (11) — cobre os 5 status, precedência e divisão por
  zero.
- `lib/goals.test.ts` (4) — Mifflin-St Jeor (M/F), fator de atividade, idade.
- Rodar: `npm test`.

---

## Estado dos dados (importante)

Tudo ainda **zerado**: EXP = 0, streak = 0, sem logs. O `DaySnapshot` em
`page.tsx` é a **costura** que o M3 vai preencher com os dados reais (água,
hábito, check-in). Por isso o status renderiza `on_track` e o check-in está
desabilitado — isso muda no M3.

## Decisões

- **Motor separado da UI** — `day-status.ts` é puro; a UI só consome. Facilita
  teste e reuso no servidor (RPC do M3).
- **Sem hook `useToday` ainda** — a agregação é trivial server-side agora; o hook
  vira útil no M3 com mutações otimistas no cliente. Adiado para evitar código
  morto.
- **`next/font` fora** — o build de fonte remota não valida no meu ambiente e
  criaria dependência de rede; a stack de sistema resolve para SF Pro no seu
  iPhone/Mac (ver passe de polimento anterior).

## Como testar

1. Commit no seu terminal (abaixo).
2. `npm run dev` → o dashboard mostra header, missão do dia (a partir do seu
   hábito + meta de água), badge "No caminho" e os 4 cards com ação.
3. `npm test` → 15 testes verdes.

```bash
cd ~/Desktop/Woolves-Life-OS
rm -f .git/index.lock
git add -A && git commit -m "M2: today dashboard + deterministic day-status engine + tests" && git push
```

## Pendências / próximo

- Assets thiings (`mission`, `water`, `nutrition`, `workout`, `money`, `trophy`,
  `life_exp`, `pack`) seguem placeholder até o download.
- **M3 — MINIMUM LIVING LOOP:** hábito + água + check-in + EXP + streak + missão
  fixa. Primeiras tabelas de log, ledger `exp_events` e RPCs `SECURITY DEFINER`.
  É o marco de **parar e usar por 3 dias reais**.
