# M7 — Implementation Notes · Sono + Peso

**Status:** ✅ Completo — typecheck limpo, 20/20 testes, `next build` exit 0.
**Ação sua:** aplicar 2 migrations.

## O que foi construído
- **Banco:** `0020_sleep_weight.sql` (`sleep_logs` 1/dia com qualidade, `weight_logs`,
  RLS); `0021_sleep_rpcs.sql` (`log_sleep` — upsert + **+15 EXP** se ≥ 7h; `log_weight`
  — registra e sincroniza `profiles.weight_kg`).
- **Tela `/sono` (Calm / Pillow / Sleep Cycle):**
  - **Tema noturno** (gradiente índigo + brilho roxo).
  - **Anel de progresso** (horas / meta 7h) com brilho roxo, count-up e pop.
  - **Qualidade** 1–5 (Péssimo → Ótimo).
  - **Histórico dos últimos 7 dias** em barras roxas (estilo Sleep Cycle).
  - **Card de Peso** — último peso + seta de tendência (▼ verde / ▲ âmbar) e registro rápido.
- **Dashboard:** card **Sono** virou link ativo para `/sono`.

## Aplicar (SQL Editor, nesta ordem)
1. `0020_sleep_weight.sql`
2. `0021_sleep_rpcs.sql`

## Commit
```bash
cd ~/Desktop/Woolves-Life-OS
rm -f .git/index.lock
git add -A && git commit -m "M7: premium sleep screen (Calm/Pillow-style ring, quality, weekly bars, night theme) + weight log + EXP" && git push
```

## Testar
`npm run dev` → card **Sono** → registre horas + qualidade → o anel preenche e sobe
o EXP (≥7h). Registre o peso e veja a tendência.

## Pendências leves (do PRD, opcionais)
- **Status composto** completo (motor consumindo sono/peso) e **missões compostas**
  (combinar proteína + água + hábito + sono). Hoje o day-status já usa água, proteína
  e gasto; sono pode ser somado num passo rápido.
- **M8:** Relatório semanal + sugestão diária com a Woolves IA (Edge Function).
