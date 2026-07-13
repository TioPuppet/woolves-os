import type { SupabaseClient } from '@supabase/supabase-js';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

export type FocusMode = 'pomodoro' | 'stopwatch';

export const FOCUS_PRESETS = [
  { label: '25 / 5', focusMinutes: 25, breakMinutes: 5 },
  { label: '50 / 10', focusMinutes: 50, breakMinutes: 10 },
  { label: '90 / 15', focusMinutes: 90, breakMinutes: 15 },
] as const;

export interface FocusSession {
  id: number;
  note_id: number | null;
  card_id: number | null;
  mode: FocusMode;
  focus_seconds: number;
  cycles: number;
  started_at: string;
  ended_at: string;
  created_at: string;
}

export function formatFocusTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatFocusMinutes(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60);
  return `${minutes} min`;
}

export function sumFocusSeconds(sessions: Pick<FocusSession, 'focus_seconds'>[]): number {
  return sessions.reduce((total, session) => total + session.focus_seconds, 0);
}

export async function fetchRecentFocusSessions(
  client: SupabaseClient,
  sinceIso: string,
): Promise<FocusSession[]> {
  const { data, error } = await client
    .from('focus_sessions')
    .select('id, note_id, card_id, mode, focus_seconds, cycles, started_at, ended_at, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(50);
  throwIfSupabaseError(error, 'fetchRecentFocusSessions');
  return (data ?? []) as FocusSession[];
}
