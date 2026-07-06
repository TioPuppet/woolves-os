import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchActiveSession } from '@/lib/training';
import { localDayString } from '@/lib/date';
import { calledName } from '@/lib/greeting';
import { TrainingClient } from '@/components/training/TrainingClient';

export default async function TreinoPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, display_name, title')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? 'America/Sao_Paulo';
  const name = calledName(profile?.title, profile?.display_name);

  const initialSession = await fetchActiveSession(
    supabase,
    localDayString(timezone),
  );

  return (
    <TrainingClient
      userId={user.id}
      name={name}
      timezone={timezone}
      initialSession={initialSession}
    />
  );
}
