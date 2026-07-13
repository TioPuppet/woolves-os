'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  fetchDreamGoals,
  fetchMonth,
  fetchBudgets,
  fetchRecurring,
  fetchScheduledMonth,
  fetchTrend,
  currentMonthKey,
  type DreamGoal,
  type DreamGoalCategory,
  type MonthKey,
  type MonthData,
  type Recurring,
  type ScheduledTransaction,
} from '@/lib/finance';

export interface TxPatch {
  type?: 'expense' | 'income';
  amount_brl?: number;
  category?: string | null;
  note?: string | null;
  ref_date?: string;
}
export type RecurringDraft = Omit<Recurring, 'id'>;
export type ScheduledDraft = Omit<ScheduledTransaction, 'id' | 'status' | 'paid_transaction_id'>;
export type DreamGoalDraft = {
  title: string;
  category: DreamGoalCategory;
  target_amount_brl: number;
  current_amount_brl: number;
  image_url: string | null;
  external_url: string | null;
  notes: string | null;
};

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
    queryKey: ['finance-month', userId, monthKey.year, monthKey.month],
    queryFn: () => fetchMonth(supabase, monthKey),
    initialData: isCurrent ? initial.transactions : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 10_000,
  });
  const budgetsQ = useQuery({
    queryKey: ['finance-budgets', userId],
    queryFn: () => fetchBudgets(supabase),
    initialData: initial.budgets,
    staleTime: 30_000,
  });
  const recurringQ = useQuery({
    queryKey: ['finance-recurring', userId],
    queryFn: () => fetchRecurring(supabase),
    initialData: initial.recurring,
    staleTime: 30_000,
  });
  const scheduledQ = useQuery({
    queryKey: ['finance-scheduled', userId, monthKey.year, monthKey.month],
    queryFn: () => fetchScheduledMonth(supabase, monthKey),
    initialData: isCurrent ? initial.scheduled : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 10_000,
  });
  const dreamGoalsQ = useQuery({
    queryKey: ['finance-dream-goals', userId],
    queryFn: () => fetchDreamGoals(supabase),
    initialData: initial.dreamGoals,
    staleTime: 30_000,
  });
  const trendQ = useQuery({
    queryKey: ['finance-trend', userId, timezone],
    queryFn: () => fetchTrend(supabase, timezone),
    initialData: initial.trend,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['finance-month'] });
    qc.invalidateQueries({ queryKey: ['finance-scheduled'] });
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

  const addScheduled = useMutation({
    mutationFn: async (d: ScheduledDraft) => {
      const { error } = await supabase
        .from('scheduled_transactions')
        .insert({ user_id: userId, status: 'pending', ...d });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-scheduled'] }),
  });

  const payScheduled = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.rpc('pay_scheduled_transaction', { p_id: id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const cancelScheduled = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('scheduled_transactions')
        .update({ status: 'canceled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-scheduled'] }),
  });

  const deleteScheduled = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('scheduled_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-scheduled'] }),
  });

  const addDreamGoal = useMutation({
    mutationFn: async (d: DreamGoalDraft) => {
      const { error } = await supabase
        .from('dream_goals')
        .insert({ user_id: userId, archived: false, ...d });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-dream-goals'] }),
  });

  const contributeDreamGoal = useMutation({
    mutationFn: async (v: { id: number; amount: number }) => {
      const { error } = await supabase.rpc('add_dream_goal_contribution', {
        p_goal_id: v.id,
        p_amount: v.amount,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-dream-goals'] }),
  });

  const updateDreamGoal = useMutation({
    mutationFn: async (v: { id: number } & Partial<DreamGoal>) => {
      const { id, ...patch } = v;
      const { error } = await supabase.from('dream_goals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-dream-goals'] }),
  });

  return {
    transactions: monthQ.data ?? [],
    budgets: budgetsQ.data ?? [],
    recurring: recurringQ.data ?? [],
    scheduled: scheduledQ.data ?? [],
    dreamGoals: dreamGoalsQ.data ?? [],
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
    addScheduled,
    payScheduled,
    cancelScheduled,
    deleteScheduled,
    addDreamGoal,
    contributeDreamGoal,
    updateDreamGoal,
  };
}
