import type { SupabaseClient } from '@supabase/supabase-js';
import { localDayString, shiftLocalDay } from '@/lib/date';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

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
}

export async function fetchSleepData(
  client: SupabaseClient,
  timezone: string,
): Promise<SleepData> {
  const today = localDayString(timezone);
  const weekAgo = shiftLocalDay(today, -6);

  const { data, error } = await client
    .from('sleep_logs')
    .select('ref_date, hours, quality')
    .gte('ref_date', weekAgo)
    .lte('ref_date', today)
    .order('ref_date');
  throwIfSupabaseError(error, 'fetchSleepData');

  const week = (data ?? []) as SleepEntry[];
  return {
    today: week.find((w) => w.ref_date === today) ?? null,
    week,
  };
}
