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
    mutationFn: async (name: string): Promise<Exercise> => {
      const { data, error } = await supabase
        .from('exercises')
        .insert({ user_id: userId, name: name.trim() })
        .select('id, name')
        .single();
      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });

  const createPlan = useMutation({
    mutationFn: async (name: string): Promise<Plan> => {
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({ user_id: userId, name: name.trim() })
        .select('id, name')
        .single();
      if (error) throw error;
      return { ...(data as { id: number; name: string }), plan_exercises: [] };
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
    }) => {
      const { error } = await supabase.from('plan_exercises').insert({
        plan_id: v.planId,
        exercise_id: v.exerciseId,
        order_idx: v.orderIdx,
      });
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
    startSession,
  };
}
