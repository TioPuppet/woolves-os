'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signUpAction, type AuthState } from '../actions';
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
      {pending ? 'Criando…' : 'Criar conta'}
    </Button>
  );
}

export default function SignUpPage() {
  const [state, formAction] = useFormState(signUpAction, initial);

  return (
    <main className="flex min-h-screen flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <ThiingsAsset assetKey="pack" size={56} />
        <div>
          <h1 className="text-xl font-semibold">Crie sua conta</h1>
          <p className="text-sm text-muted-foreground">
            Comece sua jornada na alcateia.
          </p>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <Field label="E-mail" htmlFor="email" hint="Usado para recuperar a conta.">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Usuário" htmlFor="username" hint="Você vai entrar com ele.">
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="ex.: cleomarcio"
            required
          />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Mínimo de 6 caracteres.">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
          />
        </Field>

        {state.error ? (
          <p className="text-sm text-status-broken">{state.error}</p>
        ) : null}
        {state.notice ? (
          <p className="text-sm text-status-completed">{state.notice}</p>
        ) : null}

        <SubmitButton />
      </form>

      <SocialButtons />

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary">
          Entrar
        </Link>
      </p>
    </main>
  );
}
