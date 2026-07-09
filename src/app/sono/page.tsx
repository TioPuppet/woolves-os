import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import { fetchSleepData } from '@/lib/sleep';
import { SleepClient } from '@/components/sleep/SleepClient';

export default async function SonoPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  throwIfSupabaseError(profileError, 'sleep profile');

  const timezone = profile?.timezone ?? 'America/Sao_Paulo';
  const initial = await fetchSleepData(supabase, timezone);

  return <SleepClient userId={user.id} timezone={timezone} initial={initial} />;
}
