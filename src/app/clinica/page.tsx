import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import { fetchDrugs, fetchInteractions } from '@/lib/clinical/drugs';
import { ClinicaClient } from '@/components/clinical/ClinicaClient';

export default async function ClinicaPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Gate: módulo clínico só para perfis marcados como clínicos.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_clinician')
    .eq('id', user.id)
    .single();
  throwIfSupabaseError(profileError, 'clinical profile');
  if (!profile?.is_clinician) redirect('/');

  const [initialDrugs, initialInteractions] = await Promise.all([
    fetchDrugs(supabase),
    fetchInteractions(supabase),
  ]);

  return (
    <ClinicaClient
      userId={user.id}
      initialDrugs={initialDrugs}
      initialInteractions={initialInteractions}
    />
  );
}
