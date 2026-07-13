import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayString, shiftLocalDay } from '@/lib/date';
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
  brand?: string | null;
  barcode?: string | null;
  source?: FoodSource;
  external_id?: string | null;
  verified?: boolean;
  fiber_per_100?: number | null;
  sugar_per_100?: number | null;
  sodium_mg_per_100?: number | null;
  nova_group?: number | null;
  nutriscore_grade?: string | null;
  image_url?: string | null;
}

export type FoodSource =
  | 'manual'
  | 'user'
  | 'woolves_seed'
  | 'open_food_facts'
  | 'fatsecret'
  | 'tbca'
  | 'taco';

export interface FoodSearchResult extends Omit<Food, 'id'> {
  id: string;
  local_id: number | null;
  source: FoodSource;
  external_id: string | null;
  verified: boolean;
}

export interface FoodEntry {
  id: number;
  food_id: number | null;
  created_at: string | null;
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

export interface NutritionDay {
  date: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface NutritionMeasurement {
  id: number;
  measured_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  height_cm: number | null;
  body_water_pct: number | null;
  muscle_mass_kg: number | null;
  bone_mass_kg: number | null;
  visceral_fat_level: number | null;
  neck_cm: number | null;
  chest_cm: number | null;
  abdomen_cm: number | null;
  right_arm_cm: number | null;
  left_arm_cm: number | null;
  right_thigh_cm: number | null;
  left_thigh_cm: number | null;
  right_calf_cm: number | null;
  left_calf_cm: number | null;
  skinfold_triceps_mm: number | null;
  skinfold_biceps_mm: number | null;
  skinfold_subscapular_mm: number | null;
  skinfold_suprailiac_mm: number | null;
  skinfold_abdominal_mm: number | null;
  skinfold_thigh_mm: number | null;
  skinfold_calf_mm: number | null;
  measurement_context: string;
  measurement_source: string;
  note: string | null;
}

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0)) || 0;

export async function fetchDiary(
  client: SupabaseClient,
  timezone: string,
): Promise<Diary> {
  const date = localDayString(timezone);
  const { data, error } = await client
    .from('food_logs')
    .select('id, food_id, created_at, grams, kcal, protein_g, carb_g, fat_g, meal_type, foods(name)')
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
      created_at: (r.created_at as string | null) ?? null,
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

export async function fetchNutritionHistory(
  client: SupabaseClient,
  timezone: string,
  days = 14,
): Promise<NutritionDay[]> {
  const today = localDayString(timezone);
  const start = shiftLocalDay(today, -(days - 1));
  const { data, error } = await client
    .from('food_logs')
    .select('ref_date, kcal, protein_g, carb_g, fat_g')
    .gte('ref_date', start)
    .lte('ref_date', today)
    .order('ref_date');
  throwIfSupabaseError(error, 'fetchNutritionHistory');

  const totals = new Map<string, NutritionDay>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = shiftLocalDay(start, offset);
    totals.set(date, { date, kcal: 0, protein: 0, carb: 0, fat: 0 });
  }
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const date = String(row.ref_date);
    const current = totals.get(date);
    if (!current) continue;
    current.kcal += num(row.kcal);
    current.protein += num(row.protein_g);
    current.carb += num(row.carb_g);
    current.fat += num(row.fat_g);
  }
  return [...totals.values()].map((day) => ({
    ...day,
    kcal: Math.round(day.kcal),
    protein: Math.round(day.protein * 10) / 10,
    carb: Math.round(day.carb * 10) / 10,
    fat: Math.round(day.fat * 10) / 10,
  }));
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
