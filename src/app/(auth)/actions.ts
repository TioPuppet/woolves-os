'use server';

import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type AuthState = { error?: string; notice?: string };

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!identifier || !password) {
    return { error: 'Informe usuário e senha.' };
  }

  const supabase = getSupabaseServerClient();

  // Aceita usuário OU e-mail. Se não tiver "@", resolve o e-mail pelo usuário.
  let email = identifier;
  if (!identifier.includes('@')) {
    const { data, error } = await supabase.rpc('email_for_username', {
      p_username: identifier,
    });
    if (error) return { error: 'Não foi possível validar esse usuário agora.' };
    if (!data) return { error: 'Usuário não encontrado.' };
    email = String(data);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Usuário/e-mail ou senha inválidos.' };

  redirect('/');
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email.includes('@')) return { error: 'Informe um e-mail válido.' };
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
    return { error: 'Usuário: 3 a 20 caracteres (letras, números, _ ou .).' };
  }
  if (password.length < 6) {
    return { error: 'Senha deve ter ao menos 6 caracteres.' };
  }

  const supabase = getSupabaseServerClient();

  const { data: available, error: availabilityError } = await supabase.rpc('username_available', {
    p_username: username,
  });
  if (availabilityError) {
    return { error: 'Não foi possível validar esse usuário agora.' };
  }
  if (available === false) return { error: 'Esse usuário já está em uso.' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
      return { error: 'Este e-mail já tem conta. Faça login.' };
    }
    return { error: `Não foi possível criar a conta: ${error.message}` };
  }

  // Confirmação de e-mail ativada → ainda não há sessão.
  if (!data.session) {
    return { notice: 'Conta criada. Confirme pelo link enviado ao seu e-mail e entre.' };
  }

  redirect('/onboarding');
}

export async function signOutAction(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
