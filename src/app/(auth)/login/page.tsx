'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signInAction, type AuthState } from '../actions';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Field } from '@/components/ui/field';
import { SocialButtons } from '@/components/auth/SocialButtons';

const initial: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Entrando…' : 'Entrar'}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(signInAction, initial);

  return (
    <main className="flex min-h-screen flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <ThiingsAsset assetKey="pack" size={56} />
        <div>
          <h1 className="text-xl font-semibold">Woolves Life OS</h1>
          <p className="text-sm text-muted-foreground">Entre para continuar.</p>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="Usuário" htmlFor="identifier">
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="seu usuário"
            required
          />
        </Field>
        <Field label="Senha" htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </Field>

        {state.error ? (
          <p className="text-sm text-status-broken">{state.error}</p>
        ) : null}

        <SubmitButton />
      </form>

      <SocialButtons />

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/signup" className="font-medium text-primary">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
