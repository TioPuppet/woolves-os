'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  fetchMonth,
  fetchBudgets,
  fetchRecurring,
  fetchTrend,
  currentMonthKey,
  type MonthKey,
  type MonthData,
  type Recurring,
} from '@/lib/finance';

export interface TxPatch {
  type?: 'expense' | 'income';
  amount_brl?: number;
  category?: string | null;
  note?: string | null;
  ref_date?: string;
}
export type RecurringDraft = Omit<Recurring, 'id'>;

export function useFinance(
  userId: string,
  timezone: string,
  monthKey: MonthKey,
  initial: MonthData,
) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const cur = currentMonthKey(timezone);
  const isCurrent = monthKey.year === cur.year && monthKey.month === cur.month;

  const monthQ = useQuery({
    queryKey: ['finance-month', monthKey.year, monthKey.month],
    queryFn: () => fetchMonth(supabase, monthKey),
    initialData: isCurrent ? initial.transactions : undefined,
    staleTime: 10_000,
  });
  const budgetsQ = useQuery({
    queryKey: ['finance-budgets'],
    queryFn: () => fetchBudgets(supabase),
    initialData: initial.budgets,
    staleTime: 30_000,
  });
  const recurringQ = useQuery({
    queryKey: ['finance-recurring'],
    queryFn: () => fetchRecurring(supabase),
    initialData: initial.recurring,
    staleTime: 30_000,
  });
  const trendQ = useQuery({
    queryKey: ['finance-trend'],
    queryFn: () => fetchTrend(supabase, timezone),
    initialData: initial.trend,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['finance-month'] });
    qc.invalidateQueries({ queryKey: ['finance-trend'] });
    qc.invalidateQueries({ queryKey: ['today'] });
  };

  const logTransaction = useMutation({
    mutationFn: async (v: {
      type: 'expense' | 'income';
      amount: number;
      category: string | null;
      note: string | null;
      refDate?: string | null;
    }) => {
      const { error } = await supabase.rpc('log_transaction', {
        p_type: v.type,
        p_amount: v.amount,
        p_category: v.category,
        p_note: v.note,
        p_ref_date: v.refDate ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateTransaction = useMutation({
    mutationFn: async (v: { id: number } & TxPatch) => {
      const { id, ...patch } = v;
      const { error } = await supabase.from('transactions').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setBudget = useMutation({
    mutationFn: async (v: { category: string; monthly_limit_brl: number }) => {
      const { error } = await supabase
        .from('category_budgets')
        .upsert(
          { user_id: userId, category: v.category, monthly_limit_brl: v.monthly_limit_brl },
          { onConflict: 'user_id,category' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-budgets'] }),
  });

  const deleteBudget = useMutation({
    mutationFn: async (category: string) => {
      const { error } = await supabase
        .from('category_budgets')
        .delete()
        .eq('user_id', userId)
        .eq('category', category);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-budgets'] }),
  });

  const addRecurring = useMutation({
    mutationFn: async (d: RecurringDraft) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .insert({ user_id: userId, ...d });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-recurring'] }),
  });

  const updateRecurring = useMutation({
    mutationFn: async (v: { id: number } & Partial<RecurringDraft>) => {
      const { id, ...patch } = v;
      const { error } = await supabase.from('recurring_transactions').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-recurring'] }),
  });

  const deleteRecurring = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-recurring'] }),
  });

  const applyRecurring = useMutation({
    mutationFn: async (k: MonthKey) => {
      const { data, error } = await supabase.rpc('apply_recurring', {
        p_year: k.year,
        p_month: k.month,
      });
      if (error) throw error;
      return (data as number | null) ?? 0;
    },
    onSuccess: invalidate,
  });

  return {
    transactions: monthQ.data ?? [],
    budgets: budgetsQ.data ?? [],
    recurring: recurringQ.data ?? [],
    trend: trendQ.data ?? [],
    logTransaction,
    updateTransaction,
    deleteTransaction,
    setBudget,
    deleteBudget,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    applyRecurring,
  };
}
