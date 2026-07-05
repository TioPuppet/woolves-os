# M4 — Implementation Notes · Nutrição (rasa)

**Status:** ✅ Código completo — typecheck limpo, 20/20 testes, `next build` exit 0.
**Ação sua:** aplicar **1 migration** (`0009_log_food.sql`) no banco novo.

---

## O que foi construído

**Banco**
- `0007_nutrition.sql` (schema: foods/meals/meal_items/food_logs + RLS) e
  `0008_seed_foods_br.sql` (**145 alimentos reais da TACO**) — já aplicados via `setup_all.sql`.
- **`0009_log_food.sql`** (novo) — RPC `log_food(p_food_id, p_grams)`
  `SECURITY DEFINER`: calcula kcal/proteína do alimento (seed ou próprio), grava
  o log, e concede EXP no servidor — **proteína batida → +30**, **kcal dentro de
  ±10% da meta → +20** (R2).

**App**
- `lib/today.ts` — snapshot agora inclui `kcalToday` e `proteinToday` (soma do dia).
- `hooks/useToday.ts` — mutação `logFood` (reconciliada com o servidor).
- `NutritionCard` — barras de **calorias** e **proteína** (meta do dia) + botão "Registrar refeição".
- `FoodSearchSheet` — busca no seed (debounced), seleciona alimento, informa gramas
  com **prévia de kcal/proteína**, e registra.
- `TodayClient` — card de nutrição integrado; **proteína alimenta o day-status**
  (noite com proteína <60% → "Em risco").

**Bônus — evolução de nível 🐺**
- O ícone do nível agora **evolui**: `wolf` (1–2) → `wolf-obsidian` (3–4) →
  `pack` (5–6) → `award` (7–8). Usa assets que você já tem. Definido em
  `exp-config.ts` (`levelAssetKey`).

---

## Aplicar (banco novo)
SQL Editor → cole e rode **`supabase/migrations/0009_log_food.sql`**.

## Commit
```bash
cd ~/Desktop/Woolves-Life-OS
rm -f .git/index.lock
git add -A && git commit -m "M4: nutrition UI (food search, meal logging, kcal/protein bars) + log_food RPC; level icon evolution; brand palette" && git push
```

## Como testar
`npm run dev` → card **Nutrição** → "Registrar refeição" → busque "arroz"/"frango"
→ gramas → Adicionar. As barras sobem; ao bater a meta de proteína, +30 EXP (a
barra de nível reflete após reconciliar).

---

## Pendências
- **Completar o seed** com feijão, ovo, laticínios e oleaginosas (TACO IDs >390 +
  itens de marca do Open Food Facts) — em lote separado.
- **Refeições salvas** (meals) — schema pronto; UI de salvar/repetir refeição fica
  como incremento rápido do M4 se você quiser.
- Opcional: **8 ícones dedicados de rank** (evolução completa) — lista de busca
  em inglês disponível quando quiser.
