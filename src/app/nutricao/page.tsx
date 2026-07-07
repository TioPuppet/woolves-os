import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchDiary } from '@/lib/nutrition';
import { NutritionScreen } from '@/components/nutrition/NutritionScreen';

export default async function NutricaoPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: p } = await supabase
    .from('profiles')
    .select('timezone, goal_kcal, goal_protein_g')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = p?.timezone ?? 'America/Sao_Paulo';
  const initial = await fetchDiary(supabase, timezone);

  return (
    <NutritionScreen
      userId={user.id}
      timezone={timezone}
      initial={initial}
      goalKcal={p?.goal_kcal ?? null}
      goalProteinG={p?.goal_protein_g ?? null}
    />
  );
}
