import type { SupabaseClient } from '@supabase/supabase-js';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

export interface Exercise {
  id: number;
  name: string;
  muscle_group: string | null;
}

export interface PlanExercise {
  id: number;
  exercise_id: number;
  order_idx: number;
  muscle_group: string | null;
  target_sets: number | null;
  target_reps: string | null;
  rest_seconds: number | null;
  technique: string | null;
  exercise: Exercise;
}

export interface Plan {
  id: number;
  name: string;
  muscle_groups: string[];
  plan_exercises: PlanExercise[];
}

export interface ActiveSession {
  id: number;
  plan_id: number | null;
  ref_date: string;
}

export interface SetLog {
  id: number;
  exercise_id: number;
  set_no: number;
  reps: number | null;
  load_kg: number | null;
  rpe: number | null;
  technique: string | null;
  set_type: string;
  duration_min: number | null;
  distance_km: number | null;
  rounds: number | null;
  notes: string | null;
  activity_meta: Record<string, unknown>;
}

export function isCardioGroup(group: string | null | undefined): boolean {
  return (
    group
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim() === 'cardio'
  );
}

export interface LastPerf {
  set_no: number;
  reps: number | null;
  load_kg: number | null;
  rpe: number | null;
  ref_date: string;
}

/** Plans with their ordered exercises. */
export async function fetchPlans(client: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await client
    .from('workout_plans')
    .select(
      'id, name, muscle_groups, plan_exercises(id, exercise_id, order_idx, muscle_group, target_sets, target_reps, rest_seconds, technique, exercise:exercises(id, name, muscle_group))',
    )
    .order('created_at', { ascending: true });
  throwIfSupabaseError(error, 'fetchPlans');
  const plans = (data ?? []) as unknown as Plan[];
  plans.forEach((p) =>
    p.plan_exercises?.sort((a, b) => a.order_idx - b.order_idx),
  );
  return plans;
}

/** The user's exercises (own + seed). */
export async function fetchExercises(
  client: SupabaseClient,
): Promise<Exercise[]> {
  const { data, error } = await client
    .from('exercises')
    .select('id, name, muscle_group')
    .order('name');
  throwIfSupabaseError(error, 'fetchExercises');
  return (data ?? []) as Exercise[];
}

/** Today's not-yet-completed session, if any. */
export async function fetchActiveSession(
  client: SupabaseClient,
  date: string,
): Promise<ActiveSession | null> {
  const { data, error } = await client
    .from('workout_sessions')
    .select('id, plan_id, ref_date')
    .eq('ref_date', date)
    .eq('completed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfSupabaseError(error, 'fetchActiveSession');
  return (data as ActiveSession | null) ?? null;
}
