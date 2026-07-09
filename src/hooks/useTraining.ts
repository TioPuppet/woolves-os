'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { localDayString } from '@/lib/date';
import {
  fetchPlans,
  fetchExercises,
  type Plan,
  type Exercise,
} from '@/lib/training';

export function useTraining(userId: string, timezone: string) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const plans = useQuery({
    queryKey: ['plans', userId],
    queryFn: () => fetchPlans(supabase),
  });
  const exercises = useQuery({
    queryKey: ['exercises', userId],
    queryFn: () => fetchExercises(supabase),
  });

  const createExercise = useMutation({
    mutationFn: async (v: {
      name: string;
      muscleGroup: string | null;
    }): Promise<Exercise> => {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          user_id: userId,
          name: v.name.trim(),
          muscle_group: v.muscleGroup,
        })
        .select('id, name, muscle_group')
        .single();
      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });

  const createPlan = useMutation({
    mutationFn: async (v: {
      name: string;
      muscleGroups: string[];
    }): Promise<Plan> => {
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: userId,
          name: v.name.trim(),
          muscle_groups: v.muscleGroups,
        })
        .select('id, name, muscle_groups')
        .single();
      if (error) throw error;
      return {
        ...(data as { id: number; name: string; muscle_groups: string[] }),
        plan_exercises: [],
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: number) => {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const addExerciseToPlan = useMutation({
    mutationFn: async (v: {
      planId: number;
      exerciseId: number;
      orderIdx: number;
      muscleGroup: string;
    }) => {
      const { error } = await supabase.from('plan_exercises').insert({
        plan_id: v.planId,
        exercise_id: v.exerciseId,
        order_idx: v.orderIdx,
        muscle_group: v.muscleGroup,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const updatePlanExercise = useMutation({
    mutationFn: async (v: {
      id: number;
      patch: {
        target_sets?: number | null;
        target_reps?: string | null;
        rest_seconds?: number | null;
        technique?: string | null;
      };
    }) => {
      const { error } = await supabase
        .from('plan_exercises')
        .update(v.patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const deletePlanExercise = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('plan_exercises')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const renamePlan = useMutation({
    mutationFn: async (v: { id: number; name: string }) => {
      const { error } = await supabase
        .from('workout_plans')
        .update({ name: v.name.trim() })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  // Swap the order of two exercises within a plan.
  const swapExercises = useMutation({
    mutationFn: async (v: { aId: number; aOrder: number; bId: number; bOrder: number }) => {
      const r1 = await supabase.from('plan_exercises').update({ order_idx: v.bOrder }).eq('id', v.aId);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from('plan_exercises').update({ order_idx: v.aOrder }).eq('id', v.bId);
      if (r2.error) throw r2.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const duplicatePlan = useMutation({
    mutationFn: async (plan: Plan) => {
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({ user_id: userId, name: `${plan.name} (cópia)`, muscle_groups: plan.muscle_groups })
        .select('id')
        .single();
      if (error) throw error;
      const newId = (data as { id: number }).id;
      const rows = plan.plan_exercises.map((pe) => ({
        plan_id: newId,
        exercise_id: pe.exercise_id,
        order_idx: pe.order_idx,
        muscle_group: pe.muscle_group,
        target_sets: pe.target_sets,
        target_reps: pe.target_reps,
        rest_seconds: pe.rest_seconds,
        technique: pe.technique,
      }));
      if (rows.length) {
        const { error: e2 } = await supabase.from('plan_exercises').insert(rows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  const startSession = useMutation({
    mutationFn: async (planId: number | null): Promise<number> => {
      // Fecha qualquer sessão anterior não concluída para não "ficar rolando".
      await supabase
        .from('workout_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('completed', false);
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          ref_date: localDayString(timezone),
          plan_id: planId,
          completed: false,
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: number }).id;
    },
  });

  return {
    plans: plans.data ?? [],
    exercises: exercises.data ?? [],
    createExercise,
    createPlan,
    deletePlan,
    addExerciseToPlan,
    updatePlanExercise,
    deletePlanExercise,
    renamePlan,
    swapExercises,
    duplicatePlan,
    startSession,
  };
}
