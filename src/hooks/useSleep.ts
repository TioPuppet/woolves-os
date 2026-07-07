'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchSleepData, type SleepData } from '@/lib/sleep';

export function useSleep(timezone: string, initial: SleepData) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const query = useQuery({
    queryKey: ['sleep'],
    queryFn: () => fetchSleepData(supabase, timezone),
    initialData: initial,
    staleTime: 15_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sleep'] });
    qc.invalidateQueries({ queryKey: ['today'] });
  };

  const logSleep = useMutation({
    mutationFn: async (v: { hours: number; quality: number | null }) => {
      const { error } = await supabase.rpc('log_sleep', {
        p_hours: v.hours,
        p_quality: v.quality,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { sleep: query.data ?? initial, logSleep };
}
