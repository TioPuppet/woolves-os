import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayString, shiftLocalDay } from '@/lib/date';

export const SLEEP_GOAL_HOURS = 7;

export const QUALITY_LABELS: Record<number, string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Ok',
  4: 'Bom',
  5: 'Ótimo',
};

export interface SleepEntry {
  ref_date: string;
  hours: number;
  quality: number | null;
}

export interface SleepData {
  today: SleepEntry | null;
  week: SleepEntry[]; // up to last 7 days, ascending
  latestWeight: number | null;
  prevWeight: number | null;
}

export async function fetchSleepData(
  client: SupabaseClient,
  timezone: string,
): Promise<SleepData> {
  const today = localDayString(timezone);
  const weekAgo = shiftLocalDay(today, -6);

  const [sleepRes, weightRes] = await Promise.all([
    client
      .from('sleep_logs')
      .select('ref_date, hours, quality')
      .gte('ref_date', weekAgo)
      .lte('ref_date', today)
      .order('ref_date'),
    client
      .from('weight_logs')
      .select('kg')
      .order('created_at', { ascending: false })
      .limit(2),
  ]);

  const week = (sleepRes.data ?? []) as SleepEntry[];
  const weights = (weightRes.data ?? []) as { kg: number }[];

  return {
    today: week.find((w) => w.ref_date === today) ?? null,
    week,
    latestWeight: weights[0]?.kg ?? null,
    prevWeight: weights[1]?.kg ?? null,
  };
}
