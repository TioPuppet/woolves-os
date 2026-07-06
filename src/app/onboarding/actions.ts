'use server';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type OnboardingState = { error?: string };

function toInt(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function toNum(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function completeOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sex = String(formData.get('sex') ?? '');
  const activity = String(formData.get('activity_level') ?? '');
  const requiredHabit = String(formData.get('required_habit') ?? '').trim();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  const payload = {
    display_name: displayName || null,
    title: title || null,
    sex: sex === 'male' || sex === 'female' ? sex : null,
    birth_date: String(formData.get('birth_date') ?? '') || null,
    height_cm: toNum(formData.get('height_cm')),
    weight_kg: toNum(formData.get('weight_kg')),
    activity_level: activity || null,
    goal_kcal: toInt(formData.get('goal_kcal')),
    goal_protein_g: toInt(formData.get('goal_protein_g')),
    goal_water_ml: toInt(formData.get('goal_water_ml')),
    goal_spend_limit_brl: toNum(formData.get('goal_spend_limit_brl')),
    required_habit: requiredHabit || null,
    onboarding_done: true,
  };

  if (
    !payload.goal_kcal ||
    !payload.goal_protein_g ||
    !payload.goal_water_ml ||
    !payload.required_habit
  ) {
    return { error: 'Preencha as metas e o hábito obrigatório.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id);

  if (error) return { error: 'Não foi possível salvar. Tente novamente.' };

  redirect('/');
}
