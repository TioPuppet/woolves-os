# M6 — Implementation Notes · Finanças (rasa)

**Status:** ✅ Completo — typecheck limpo, 20/20 testes, `next build` exit 0.
**Ação sua:** aplicar 2 migrations.

## O que foi construído
- **Banco:** `0018_finance.sql` (tabela `transactions` + RLS, separada de saúde — R4);
  `0019_finance_rpcs.sql` (`log_transaction` + `submit_checkin` atualizado para
  conceder **spend_within_limit (+25)** quando o gasto do dia fica dentro do limite).
- **Tela `/financas`:** status do **limite diário** (barra verde/âmbar/vermelha),
  receita do dia, e um **lançamento rápido**: Despesa/Receita → valor → **chips de
  categoria com ícones** (Alimentação, Transporte, Moradia, Saúde, Lazer, Educação,
  Roupas, Tecnologia, Investimentos, Salário, Freelance, Outros) → nota → Registrar.
  Lista de lançamentos do dia com exclusão.
- **Bottom nav:** agora 4 abas — **Hoje · Treino · Finanças · Perfil**.
- **Dashboard:** card **Finanças** virou link ativo; o **gasto do dia entra no
  day-status** (>80% do limite → "Em risco").

## Aplicar (SQL Editor, nesta ordem)
1. `0018_finance.sql`
2. `0019_finance_rpcs.sql`

## Commit
```bash
cd ~/Desktop/Woolves-Life-OS
rm -f .git/index.lock
git add -A && git commit -m "M6: finance (expense/income, category chips, daily-limit status, spend in day-status, 4th nav tab)" && git push
```

## Testar
`npm run dev` → aba **Finanças** → registre uma despesa (ex.: Alimentação, R$ 30) →
a barra do limite reage; o dashboard mostra o status. No check-in, se ficar dentro
do limite, ganha +25 EXP.

## Próximo (M7)
Sono + peso (quick logs) + status composto + missões compostas.
