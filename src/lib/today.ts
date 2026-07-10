import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayString, shiftLocalDay } from '@/lib/date';
import type { DayStatus } from '@/lib/day-status';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

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
  userId: string;
  title: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  requiredHabit: string | null;
  goalWaterMl: number | null;
  goalProteinG: number | null;
  goalKcal: number | null;
  goalSpendLimitBrl: number | null;
}

export interface TodayCampaignDay {
  date: string;
  weekday: string;
  status: DayStatus | null;
  missionDone: boolean;
  habitDone: boolean;
  waterMl: number;
  waterGoalMl: number | null;
  exp: number;
  closed: boolean;
  conquered: boolean;
}

export interface TodayCampaign {
  days: TodayCampaignDay[];
  expWeek: number;
  closedDays: number;
  conqueredDays: number;
  bestChain: number;
  focusLabel: string;
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
  throwIfSupabaseError(water.error, 'fetchTodaySnapshot water');
  throwIfSupabaseError(habit.error, 'fetchTodaySnapshot habit');
  throwIfSupabaseError(checkin.error, 'fetchTodaySnapshot checkin');
  throwIfSupabaseError(exp.error, 'fetchTodaySnapshot exp');
  throwIfSupabaseError(profile.error, 'fetchTodaySnapshot profile');
  throwIfSupabaseError(food.error, 'fetchTodaySnapshot food');
  throwIfSupabaseError(spend.error, 'fetchTodaySnapshot spend');
  throwIfSupabaseError(weight.error, 'fetchTodaySnapshot weight');
  throwIfSupabaseError(mission.error, 'fetchTodaySnapshot mission');

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

function weekdayLabel(dayString: string): string {
  const [year, month, day] = dayString.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace('.', '');
}

function campaignFocus(conqueredDays: number, closedDays: number): string {
  if (conqueredDays >= 6) return 'Semana lendária';
  if (conqueredDays >= 4) return 'Domínio crescente';
  if (conqueredDays >= 2) return 'Ritmo de campanha';
  if (closedDays > 0) return 'Reconstruindo força';
  return 'Primeiro território';
}

function longestConqueredChain(days: TodayCampaignDay[]): number {
  let current = 0;
  let best = 0;
  for (const day of days) {
    if (day.conquered) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

export async function fetchTodayCampaign(
  client: SupabaseClient,
  timezone: string,
  waterGoalMl: number | null,
): Promise<TodayCampaign> {
  const today = localDayString(timezone);
  const start = shiftLocalDay(today, -6);
  const dates = Array.from({ length: 7 }, (_, i) => shiftLocalDay(start, i));

  const [checkins, water, habits, missions, exp] = await Promise.all([
    client
      .from('checkins')
      .select('ref_date, day_status')
      .gte('ref_date', start)
      .lte('ref_date', today),
    client
      .from('water_logs')
      .select('ref_date, ml')
      .gte('ref_date', start)
      .lte('ref_date', today),
    client
      .from('habit_logs')
      .select('ref_date, done')
      .eq('habit_key', 'required')
      .gte('ref_date', start)
      .lte('ref_date', today),
    client
      .from('daily_missions')
      .select('ref_date, done')
      .gte('ref_date', start)
      .lte('ref_date', today),
    client
      .from('exp_events')
      .select('ref_date, amount')
      .gte('ref_date', start)
      .lte('ref_date', today),
  ]);

  throwIfSupabaseError(checkins.error, 'fetchTodayCampaign checkins');
  throwIfSupabaseError(water.error, 'fetchTodayCampaign water');
  throwIfSupabaseError(habits.error, 'fetchTodayCampaign habits');
  throwIfSupabaseError(missions.error, 'fetchTodayCampaign missions');
  throwIfSupabaseError(exp.error, 'fetchTodayCampaign exp');

  const statusByDate = new Map(
    (checkins.data ?? []).map((r: { ref_date: string; day_status: string }) => [
      r.ref_date,
      r.day_status as DayStatus,
    ]),
  );
  const habitByDate = new Map(
    (habits.data ?? []).map((r: { ref_date: string; done: boolean }) => [
      r.ref_date,
      r.done === true,
    ]),
  );
  const missionByDate = new Map(
    (missions.data ?? []).map((r: { ref_date: string; done: boolean }) => [
      r.ref_date,
      r.done === true,
    ]),
  );
  const waterByDate = new Map<string, number>();
  for (const row of (water.data ?? []) as { ref_date: string; ml: number }[]) {
    waterByDate.set(row.ref_date, (waterByDate.get(row.ref_date) ?? 0) + row.ml);
  }
  const expByDate = new Map<string, number>();
  for (const row of (exp.data ?? []) as { ref_date: string; amount: number }[]) {
    expByDate.set(row.ref_date, (expByDate.get(row.ref_date) ?? 0) + row.amount);
  }

  const days = dates.map((date): TodayCampaignDay => {
    const waterMl = waterByDate.get(date) ?? 0;
    const status = statusByDate.get(date) ?? null;
    const missionDone = missionByDate.get(date) === true;
    const habitDone = habitByDate.get(date) === true;
    const waterDone = waterGoalMl == null || waterMl >= waterGoalMl;
    const conquered = missionDone && habitDone && waterDone;

    return {
      date,
      weekday: weekdayLabel(date),
      status,
      missionDone,
      habitDone,
      waterMl,
      waterGoalMl,
      exp: expByDate.get(date) ?? 0,
      closed: status != null,
      conquered,
    };
  });

  const closedDays = days.filter((day) => day.closed).length;
  const conqueredDays = days.filter((day) => day.conquered).length;
  const expWeek = days.reduce((sum, day) => sum + day.exp, 0);

  return {
    days,
    expWeek,
    closedDays,
    conqueredDays,
    bestChain: longestConqueredChain(days),
    focusLabel: campaignFocus(conqueredDays, closedDays),
  };
}
