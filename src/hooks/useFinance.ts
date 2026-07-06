'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchFinanceToday, type FinanceToday } from '@/lib/finance';

export function useFinance(
  timezone: string,
  limit: number | null,
  initial: FinanceToday,
) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const query = useQuery({
    queryKey: ['finance-today'],
    queryFn: () => fetchFinanceToday(supabase, timezone, limit),
    initialData: initial,
    staleTime: 15_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['finance-today'] });
    qc.invalidateQueries({ queryKey: ['today'] });
  };

  const logTransaction = useMutation({
    mutationFn: async (v: {
      type: 'expense' | 'income';
      amount: number;
      category: string | null;
      note: string | null;
    }) => {
      const { error } = await supabase.rpc('log_transaction', {
        p_type: v.type,
        p_amount: v.amount,
        p_category: v.category,
        p_note: v.note,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { finance: query.data ?? initial, logTransaction, deleteTransaction };
}
