import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayString } from '@/lib/date';
import type { DayStatus } from '@/lib/day-status';

/** Dynamic per-day snapshot (the parts that change as the user logs). */
export interface TodaySnapshot {
  date: string;
  waterMl: number;
  habitDone: boolean;
  checkinStatus: DayStatus | null;
  expTotal: number;
  streak: number;
  kcalToday: number;
  proteinToday: number;
  spentToday: number;
  latestWeight: number | null;
  prevWeight: number | null;
  missionText: string | null;
  missionDone: boolean;
}

/** Static profile context passed from the server (doesn't change intra-day). */
export interface TodayProfile {
  title: string | null;
  displayName: string | null;
  timezone: string;
  requiredHabit: string | null;
  goalWaterMl: number | null;
  goalProteinG: number | null;
  goalKcal: number | null;
  goalSpendLimitBrl: number | null;
}

/** Fetch today's dynamic snapshot via RLS-protected reads (owner-only). */
export async function fetchTodaySnapshot(
  client: SupabaseClient,
  timezone: string,
): Promise<TodaySnapshot> {
  const date = localDayString(timezone);

  const [water, habit, checkin, exp, profile, food, spend, weight, mission] =
    await Promise.all([
    client.from('water_logs').select('ml').eq('ref_date', date),
    client
      .from('habit_logs')
      .select('done')
      .eq('ref_date', date)
      .eq('habit_key', 'required')
      .maybeSingle(),
    client
      .from('checkins')
      .select('day_status')
      .eq('ref_date', date)
      .maybeSingle(),
    client.rpc('get_exp_total'),
    client.from('profiles').select('current_streak').maybeSingle(),
    client.from('food_logs').select('kcal, protein_g').eq('ref_date', date),
    client
      .from('transactions')
      .select('amount_brl')
      .eq('ref_date', date)
      .eq('type', 'expense'),
    client
      .from('weight_logs')
      .select('kg')
      .order('created_at', { ascending: false })
      .limit(2),
    client
      .from('daily_missions')
      .select('text, done')
      .eq('ref_date', date)
      .maybeSingle(),
  ]);

  const waterMl = (water.data ?? []).reduce(
    (sum: number, r: { ml: number }) => sum + r.ml,
    0,
  );
  const foodRows = (food.data ?? []) as { kcal: number; protein_g: number }[];
  const kcalToday = foodRows.reduce((s, r) => s + (r.kcal ?? 0), 0);
  const proteinToday = foodRows.reduce((s, r) => s + Number(r.protein_g ?? 0), 0);
  const spendRows = (spend.data ?? []) as { amount_brl: number }[];
  const spentToday = spendRows.reduce((s, r) => s + Number(r.amount_brl ?? 0), 0);
  const weightRows = (weight.data ?? []) as { kg: number }[];

  return {
    date,
    waterMl,
    habitDone: habit.data?.done === true,
    checkinStatus: (checkin.data?.day_status as DayStatus | undefined) ?? null,
    expTotal: typeof exp.data === 'number' ? exp.data : 0,
    streak: profile.data?.current_streak ?? 0,
    kcalToday,
    proteinToday: Math.round(proteinToday * 10) / 10,
    spentToday: Math.round(spentToday * 100) / 100,
    latestWeight: weightRows[0]?.kg ?? null,
    prevWeight: weightRows[1]?.kg ?? null,
    missionText: (mission.data?.text as string | undefined)?.trim() || null,
    missionDone: mission.data?.done === true,
  };
}

