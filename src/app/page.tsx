import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import { fetchTodaySnapshot, type TodayProfile } from '@/lib/today';
import { TodayClient } from '@/components/dashboard/TodayClient';

/**
 * Today Dashboard — M3. Server fetches the initial profile + snapshot for an
 * instant first paint; the interactive loop (quick logs, check-in, optimistic
 * updates) runs client-side in TodayClient.
 */
export default async function TodayPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: p, error: profileError } = await supabase
    .from('profiles')
    .select(
      'title, display_name, timezone, required_habit, goal_water_ml, goal_protein_g, goal_kcal, goal_spend_limit_brl',
    )
    .eq('id', user.id)
    .maybeSingle();
  throwIfSupabaseError(profileError, 'today profile');

  const timezone = p?.timezone ?? 'America/Sao_Paulo';

  const profile: TodayProfile = {
    userId: user.id,
    title: p?.title ?? null,
    displayName: p?.display_name ?? null,
    timezone,
    requiredHabit: p?.required_habit ?? null,
    goalWaterMl: p?.goal_water_ml ?? null,
    goalProteinG: p?.goal_protein_g ?? null,
    goalKcal: p?.goal_kcal ?? null,
    goalSpendLimitBrl: p?.goal_spend_limit_brl ?? null,
  };

  const initial = await fetchTodaySnapshot(supabase, timezone);

  return <TodayClient profile={profile} initial={initial} />;
}
