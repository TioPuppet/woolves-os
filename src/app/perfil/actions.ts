'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function updateProfileName(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const displayName = String(formData.get('display_name') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  await supabase
    .from('profiles')
    .update({ display_name: displayName || null, title: title || null })
    .eq('id', user.id);

  revalidatePath('/perfil');
  revalidatePath('/');
}
