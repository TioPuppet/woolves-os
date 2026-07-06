import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchActiveSession } from '@/lib/training';
import { localDayString } from '@/lib/date';
import { TrainingClient } from '@/components/training/TrainingClient';

export default async function TreinoPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, display_name')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? 'America/Sao_Paulo';
  const raw = (profile?.display_name ?? '').trim();
  const looksLikeName = /\s/.test(raw) || /[A-ZÀ-Ý]/.test(raw);
  const name = looksLikeName ? (raw.split(/\s+/)[0] ?? 'Lobo') : 'Lobo';

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
