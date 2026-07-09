import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayString } from '@/lib/date';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

export type MealType = 'cafe' | 'almoco' | 'jantar' | 'lanche';

export const MEALS: { key: MealType; label: string }[] = [
  { key: 'cafe', label: 'Café da manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'jantar', label: 'Jantar' },
  { key: 'lanche', label: 'Lanches' },
];

export interface Food {
  id: number;
  name: string;
  kcal_per_100: number;
  protein_per_100: number;
  carb_per_100: number | null;
  fat_per_100: number | null;
}

export interface FoodEntry {
  id: number;
  food_id: number | null;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  meal_type: MealType;
}

export interface MacroTotals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface Diary {
  date: string;
  entries: FoodEntry[];
  totals: MacroTotals;
}

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0)) || 0;

export async function fetchDiary(
  client: SupabaseClient,
  timezone: string,
): Promise<Diary> {
  const date = localDayString(timezone);
  const { data, error } = await client
    .from('food_logs')
    .select('id, food_id, grams, kcal, protein_g, carb_g, fat_g, meal_type, foods(name)')
    .eq('ref_date', date)
    .order('created_at');
  throwIfSupabaseError(error, 'fetchDiary');

  const rows = (data ?? []) as Record<string, unknown>[];
  const entries: FoodEntry[] = rows.map((r) => {
    const foods = r.foods as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(foods) ? foods[0]?.name : foods?.name;
    return {
      id: r.id as number,
      food_id: (r.food_id as number | null) ?? null,
      name: name ?? 'Alimento',
      grams: num(r.grams),
      kcal: num(r.kcal),
      protein_g: num(r.protein_g),
      carb_g: num(r.carb_g),
      fat_g: num(r.fat_g),
      meal_type: (r.meal_type as MealType) ?? 'almoco',
    };
  });

  const totals = entries.reduce<MacroTotals>(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein: Math.round((t.protein + e.protein_g) * 10) / 10,
      carb: Math.round((t.carb + e.carb_g) * 10) / 10,
      fat: Math.round((t.fat + e.fat_g) * 10) / 10,
    }),
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );

  return { date, entries, totals };
}

export function entriesOf(diary: Diary, meal: MealType): FoodEntry[] {
  return diary.entries.filter((e) => e.meal_type === meal);
}

export function mealKcal(diary: Diary, meal: MealType): number {
  return entriesOf(diary, meal).reduce((s, e) => s + e.kcal, 0);
}

/** Percentual de calorias por macro (4/4/9 kcal por g). */
export function macroPercents(t: MacroTotals): {
  protein: number;
  carb: number;
  fat: number;
} {
  const pk = t.protein * 4;
  const ck = t.carb * 4;
  const fk = t.fat * 9;
  const sum = pk + ck + fk;
  if (sum <= 0) return { protein: 0, carb: 0, fat: 0 };
  return {
    protein: Math.round((pk / sum) * 100),
    carb: Math.round((ck / sum) * 100),
    fat: Math.round((fk / sum) * 100),
  };
}
