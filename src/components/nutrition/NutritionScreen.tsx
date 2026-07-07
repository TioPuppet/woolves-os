'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { useNutrition } from '@/hooks/useNutrition';
import {
  MEALS,
  entriesOf,
  mealKcal,
  macroPercents,
  type Diary,
  type MealType,
} from '@/lib/nutrition';
import { FoodSheet } from './FoodSheet';

function MacroCol({ label, grams, pct, tone }: { label: string; grams: number; pct: number; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-base font-bold" style={{ color: `hsl(${tone})` }}>
        {grams}g
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function NutritionScreen({
  userId,
  timezone,
  initial,
  goalKcal,
  goalProteinG,
}: {
  userId: string;
  timezone: string;
  initial: Diary;
  goalKcal: number | null;
  goalProteinG: number | null;
}) {
  const { diary, logFood, removeEntry, createFood } = useNutrition(userId, timezone, initial);
  const [sheet, setSheet] = useState<{ open: boolean; meal: MealType }>({ open: false, meal: 'cafe' });

  const t = diary.totals;
  const pct = macroPercents(t);
  const remaining = goalKcal != null ? goalKcal - t.kcal : null;
  const kcalPct = goalKcal ? Math.min(100, Math.round((t.kcal / goalKcal) * 100)) : 0;

  return (
    <main className="flex min-h-screen flex-col gap-5 px-5 pb-28 pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="alimentacao" size={30} />
          <h1 className="text-xl font-semibold">Nutrição</h1>
        </div>
        <Link href="/" className="press text-sm text-muted-foreground">Fechar</Link>
      </header>

      {/* Resumo diário */}
      <section className="hero-mission rounded-3xl p-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {remaining != null ? 'Calorias restantes' : 'Calorias hoje'}
            </p>
            <p className="text-4xl font-bold leading-tight">
              {remaining != null ? remaining : t.kcal}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                {remaining != null ? 'kcal' : 'kcal'}
              </span>
            </p>
          </div>
          {goalKcal != null && (
            <p className="text-right text-xs text-muted-foreground">
              Meta {goalKcal}<br />Consumido {t.kcal}
            </p>
          )}
        </div>

        {goalKcal != null && (
          <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-card/60">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${kcalPct}%` }} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
          <MacroCol label="Carboidrato" grams={t.carb} pct={pct.carb} tone="211 90% 58%" />
          <MacroCol label="Proteína" grams={t.protein} pct={pct.protein} tone="145 63% 49%" />
          <MacroCol label="Gordura" grams={t.fat} pct={pct.fat} tone="38 92% 55%" />
        </div>
        {goalProteinG != null && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Proteína: {t.protein}g de {goalProteinG}g
          </p>
        )}
      </section>

      {/* Refeições */}
      {MEALS.map((m) => {
        const entries = entriesOf(diary, m.key);
        return (
          <section key={m.key} className="surface-2 flex flex-col gap-2 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{m.label}</h2>
              <span className="text-xs text-muted-foreground">{mealKcal(diary, m.key)} kcal</span>
            </div>

            {entries.length > 0 && (
              <div className="flex flex-col divide-y divide-border/60">
                {entries.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.grams}g · {e.kcal} kcal · C{e.carb_g} P{e.protein_g} G{e.fat_g}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry.mutate(e.id)}
                      aria-label="Remover"
                      className="press shrink-0 text-muted-foreground hover:text-status-broken"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSheet({ open: true, meal: m.key })}
              className="press mt-1 flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm font-medium text-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Adicionar alimento
            </button>
          </section>
        );
      })}

      <FoodSheet
        open={sheet.open}
        meal={sheet.meal}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onLog={(foodId, grams, meal) => {
          logFood.mutate(
            { foodId, grams, meal },
            { onSuccess: () => setSheet((s) => ({ ...s, open: false })) },
          );
        }}
        onCreateFood={(f) => createFood.mutateAsync(f)}
        pending={logFood.isPending}
      />
    </main>
  );
}
