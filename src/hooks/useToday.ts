'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchTodaySnapshot, type TodaySnapshot } from '@/lib/today';

/**
 * Today loop state: reads the snapshot and exposes optimistic mutations for the
 * quick logs. Each mutation hits the server directly (online-first) — on error
 * the optimistic update is rolled back.
 */
export function useToday(
  userId: string,
  timezone: string,
  initial: TodaySnapshot,
) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const key = ['today', userId, timezone] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchTodaySnapshot(supabase, timezone),
    initialData: initial,
    staleTime: 15_000,
  });

  const logWater = useMutation({
    mutationFn: async (ml: number) => {
      const { error } = await supabase.rpc('log_water', { p_ml: ml });
      if (error) throw error;
    },
    onMutate: async (ml: number) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TodaySnapshot>(key);
      if (prev) {
        qc.setQueryData<TodaySnapshot>(key, {
          ...prev,
          waterMl: prev.waterMl + ml,
        });
      }
      return { prev };
    },
    onError: (_e, _ml, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const removeWater = useMutation({
    mutationFn: async (ml: number) => {
      const { error } = await supabase.rpc('remove_water', { p_ml: ml });
      if (error) throw error;
    },
    onMutate: async (ml: number) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TodaySnapshot>(key);
      if (prev) {
        qc.setQueryData<TodaySnapshot>(key, {
          ...prev,
          waterMl: Math.max(0, prev.waterMl - ml),
        });
      }
      return { prev };
    },
    onError: (_e, _ml, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const toggleHabit = useMutation({
    mutationFn: async (done: boolean) => {
      const { error } = await supabase.rpc('toggle_habit', {
        p_key: 'required',
        p_done: done,
      });
      if (error) throw error;
    },
    onMutate: async (done: boolean) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TodaySnapshot>(key);
      if (prev) qc.setQueryData<TodaySnapshot>(key, { ...prev, habitDone: done });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const logFood = useMutation({
    mutationFn: async (v: { foodId: number; grams: number }) => {
      const { error } = await supabase.rpc('log_food', {
        p_food_id: v.foodId,
        p_grams: v.grams,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const logWeight = useMutation({
    mutationFn: async (kg: number) => {
      const { error } = await supabase.rpc('log_weight', { p_kg: kg });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const setMission = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.rpc('set_daily_mission', { p_text: text });
      if (error) throw error;
    },
    onMutate: async (text: string) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TodaySnapshot>(key);
      if (prev) {
        qc.setQueryData<TodaySnapshot>(key, {
          ...prev,
          missionText: text.trim() || null,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const setMissionDone = useMutation({
    mutationFn: async (done: boolean) => {
      const { error } = await supabase.rpc('set_mission_done', { p_done: done });
      if (error) throw error;
    },
    onMutate: async (done: boolean) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TodaySnapshot>(key);
      if (prev) qc.setQueryData<TodaySnapshot>(key, { ...prev, missionDone: done });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const submitCheckin = useMutation({
    mutationFn: async (v: {
      mood: number;
      note: string;
      missionDone: boolean;
    }) => {
      const { error } = await supabase.rpc('submit_checkin', {
        p_mood: v.mood,
        p_note: v.note,
        p_mission_done: v.missionDone,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    snapshot: query.data ?? initial,
    logWater,
    removeWater,
    toggleHabit,
    logFood,
    logWeight,
    setMission,
    setMissionDone,
    submitCheckin,
  };
}
