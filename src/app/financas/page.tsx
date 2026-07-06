import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchFinanceToday } from '@/lib/finance';
import { FinanceClient } from '@/components/finance/FinanceClient';

export default async function FinancasPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, goal_spend_limit_brl')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? 'America/Sao_Paulo';
  const limit = profile?.goal_spend_limit_brl ?? null;
  const initial = await fetchFinanceToday(supabase, timezone, limit);

  return <FinanceClient timezone={timezone} limit={limit} initial={initial} />;
}
