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
    queryKey: ['plans'],
    queryFn: () => fetchPlans(supabase),
  });
  const exercises = useQuery({
    queryKey: ['exercises'],
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

  const startSession = useMutation({
    mutationFn: async (planId: number | null): Promise<number> => {
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
    startSession,
  };
}
