import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import {
  fetchMonth,
  fetchBudgets,
  fetchRecurring,
  fetchTrend,
  currentMonthKey,
  type MonthData,
} from '@/lib/finance';
import { FinanceClient } from '@/components/finance/FinanceClient';

export default async function FinancasPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('timezone, goal_spend_limit_brl')
    .eq('id', user.id)
    .maybeSingle();
  throwIfSupabaseError(profileError, 'finance profile');

  const timezone = profile?.timezone ?? 'America/Sao_Paulo';
  const dailyLimit = profile?.goal_spend_limit_brl ?? null;
  const monthKey = currentMonthKey(timezone);

  const [transactions, budgets, recurring, trend] = await Promise.all([
    fetchMonth(supabase, monthKey),
    fetchBudgets(supabase),
    fetchRecurring(supabase),
    fetchTrend(supabase, timezone),
  ]);
  const initial: MonthData = { transactions, budgets, recurring, trend };

  return (
    <FinanceClient
      userId={user.id}
      timezone={timezone}
      dailyLimit={dailyLimit}
      initial={initial}
    />
  );
}
