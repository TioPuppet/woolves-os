'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

export async function updateProfileName(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const displayName = String(formData.get('display_name') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName || null, title: title || null })
    .eq('id', user.id);
  throwIfSupabaseError(error, 'update profile name');

  revalidatePath('/perfil');
  revalidatePath('/');
}

function avatarExtension(type: string): string | null {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return null;
}

export async function updateProfileAvatar(formData: FormData) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) return;

  const ext = avatarExtension(file.type);
  if (!ext) throw new Error('Formato de imagem inválido.');
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 5MB.');
  }

  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true,
    });
  throwIfSupabaseError(uploadError, 'upload profile avatar');

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);
  throwIfSupabaseError(error, 'update profile avatar');

  revalidatePath('/perfil');
  revalidatePath('/');
}

export async function removeProfileAvatar() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id);
  throwIfSupabaseError(error, 'remove profile avatar');

  revalidatePath('/perfil');
  revalidatePath('/');
}
