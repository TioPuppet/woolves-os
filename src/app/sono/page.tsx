import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchSleepData } from '@/lib/sleep';
import { SleepClient } from '@/components/sleep/SleepClient';

export default async function SonoPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? 'America/Sao_Paulo';
  const initial = await fetchSleepData(supabase, timezone);

  return <SleepClient timezone={timezone} initial={initial} />;
}
