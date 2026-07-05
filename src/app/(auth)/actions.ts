'use server';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; notice?: string };

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Informe e-mail e senha.' };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'E-mail ou senha inválidos.' };

  // Middleware routes to /onboarding or / based on onboarding status.
  redirect('/');
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || password.length < 6) {
    return { error: 'Senha deve ter ao menos 6 caracteres.' };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: 'Não foi possível criar a conta. Tente outro e-mail.' };

  // If e-mail confirmation is enabled, there is no session yet.
  if (!data.session) {
    return {
      notice: 'Conta criada. Confirme pelo link enviado ao seu e-mail e faça login.',
    };
  }

  redirect('/onboarding');
}

export async function signOutAction(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
