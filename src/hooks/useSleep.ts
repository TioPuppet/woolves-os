'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchSleepData, type SleepData } from '@/lib/sleep';

export function useSleep(userId: string, timezone: string, initial: SleepData) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const key = ['sleep', userId, timezone] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSleepData(supabase, timezone),
    initialData: initial,
    staleTime: 15_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['today'] });
  };

  const logSleep = useMutation({
    mutationFn: async (v: {
      hours: number;
      quality: number | null;
      bedTime: string | null;
      wakeTime: string | null;
    }) => {
      const { error } = await supabase.rpc('log_sleep', {
        p_hours: v.hours,
        p_quality: v.quality,
        p_bed_time: v.bedTime,
        p_wake_time: v.wakeTime,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { sleep: query.data ?? initial, logSleep };
}
