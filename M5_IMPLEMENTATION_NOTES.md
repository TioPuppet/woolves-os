# M5 — Implementation Notes · Treino (raso)

**Status:** ✅ Completo — typecheck limpo, 20/20 testes, `next build` exit 0.
**Banco:** `0010_training.sql` + `0011_training_rpcs.sql` já aplicados por você.
**Ação sua:** só commitar.

---

## O que foi construído

**Rota nova `/treino`** (server → `TrainingClient`).

**Fluxo completo:**
- **Planos (CRUD):** criar plano por nome, adicionar exercícios (cria o exercício
  se não existir), excluir plano.
- **Executar treino:** "Treinar" num plano → cria `workout_session` → tela de
  execução.
- **Tela de execução (`SessionView`):** para cada exercício mostra a **última
  performance** (`last_exercise_performance`), as séries já registradas na sessão,
  e um logger rápido de **reps / carga / RPE** (+ série).
- **Concluir treino:** `complete_session` → **+50 EXP** (`workout_completed`),
  invalida o dashboard.
- **Retomada:** se houver sessão do dia não concluída, `/treino` reabre nela.

**Dashboard:** o card **Treino** agora é ativo (link para `/treino`, acento ouro
"Registrar"); Finanças e Sono seguem como "Em breve".

**Dados:** `lib/training.ts` (tipos + fetchers com selects aninhados) e
`hooks/useTraining.ts` (planos, exercícios, criar/adicionar/iniciar via TanStack
Query). Escrita protegida por RLS (posse do plano/sessão).

---

## Commit
```bash
cd ~/Desktop/Woolves-Life-OS
rm -f .git/index.lock
git add -A && git commit -m "M5: training UI (plans CRUD, session logging sets/reps/load/RPE, last performance, +50 EXP)" && git push
```

## Como testar
`npm run dev` → card **Treino** → "Registrar" → crie um plano (ex.: "Peito") →
adicione exercícios (ex.: "Supino reto") → **Treinar** → registre séries
(reps/kg/RPE) → **Concluir treino**. O EXP sobe no dashboard; ao treinar de novo,
a "última vez" aparece.

---

## Pendências / próximo
- **Seed de exercícios** comuns (supino, agachamento, etc.) — opcional, hoje o
  usuário cria inline.
- Completar o **seed de alimentos** (feijão/ovo/laticínios via Open Food Facts).
- **M6 — Finanças** (despesa/receita, chips de categoria, status do limite diário).
- Estrutural: navegação inferior fixa (bottom nav) quando tivermos 3+ telas.
