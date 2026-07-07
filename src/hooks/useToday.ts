'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchTodaySnapshot, type TodaySnapshot } from '@/lib/today';
import {
  enqueueMutation,
  readQueue,
  clearQueue,
} from '@/lib/offline-queue';

const KEY = ['today'] as const;

/**
 * Today loop state: reads the snapshot and exposes optimistic mutations for the
 * quick logs. Water/habit fall back to the IndexedDB offline queue (R5) and are
 * replayed when connectivity returns; check-in is online-only.
 */
export function useToday(timezone: string, initial: TodaySnapshot) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchTodaySnapshot(supabase, timezone),
    initialData: initial,
    staleTime: 15_000,
  });

  // Replay any queued mutations on mount and whenever we come back online.
  useEffect(() => {
    const drain = async () => {
      const items = await readQueue();
      if (!items.length) return;
      for (const it of items) {
        if (it.kind === 'water') {
          await supabase.rpc('log_water', { p_ml: it.ml });
        } else {
          await supabase.rpc('toggle_habit', {
            p_key: it.habitKey,
            p_done: it.done,
          });
        }
      }
      await clearQueue();
      qc.invalidateQueries({ queryKey: KEY });
    };
    window.addEventListener('online', drain);
    void drain();
    return () => window.removeEventListener('online', drain);
  }, [supabase, qc]);

  const logWater = useMutation({
    mutationFn: async (ml: number) => {
      if (!navigator.onLine) return enqueueMutation({ kind: 'water', ml });
      const { error } = await supabase.rpc('log_water', { p_ml: ml });
      if (error) await enqueueMutation({ kind: 'water', ml });
    },
    onMutate: async (ml: number) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TodaySnapshot>(KEY);
      if (prev) {
        qc.setQueryData<TodaySnapshot>(KEY, {
          ...prev,
          waterMl: prev.waterMl + ml,
        });
      }
      return { prev };
    },
    onError: (_e, _ml, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const toggleHabit = useMutation({
    mutationFn: async (done: boolean) => {
      if (!navigator.onLine) {
        return enqueueMutation({ kind: 'habit', habitKey: 'required', done });
      }
      const { error } = await supabase.rpc('toggle_habit', {
        p_key: 'required',
        p_done: done,
      });
      if (error) {
        await enqueueMutation({ kind: 'habit', habitKey: 'required', done });
      }
    },
    onMutate: async (done: boolean) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TodaySnapshot>(KEY);
      if (prev) qc.setQueryData<TodaySnapshot>(KEY, { ...prev, habitDone: done });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const logFood = useMutation({
    mutationFn: async (v: { foodId: number; grams: number }) => {
      const { error } = await supabase.rpc('log_food', {
        p_food_id: v.foodId,
        p_grams: v.grams,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const logWeight = useMutation({
    mutationFn: async (kg: number) => {
      const { error } = await supabase.rpc('log_weight', { p_kg: kg });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const setMission = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.rpc('set_daily_mission', { p_text: text });
      if (error) throw error;
    },
    onMutate: async (text: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TodaySnapshot>(KEY);
      if (prev) {
        qc.setQueryData<TodaySnapshot>(KEY, {
          ...prev,
          missionText: text.trim() || null,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const setMissionDone = useMutation({
    mutationFn: async (done: boolean) => {
      const { error } = await supabase.rpc('set_mission_done', { p_done: done });
      if (error) throw error;
    },
    onMutate: async (done: boolean) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TodaySnapshot>(KEY);
      if (prev) qc.setQueryData<TodaySnapshot>(KEY, { ...prev, missionDone: done });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    snapshot: query.data ?? initial,
    logWater,
    toggleHabit,
    logFood,
    logWeight,
    setMission,
    setMissionDone,
    submitCheckin,
  };
}
