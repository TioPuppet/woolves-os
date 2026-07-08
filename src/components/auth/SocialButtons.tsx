'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Provider = 'google' | 'facebook' | 'discord';

const PROVIDERS: { key: Provider; label: string; bg: string; fg: string }[] = [
  { key: 'google', label: 'Google', bg: '#ffffff', fg: '#1f1f1f' },
  { key: 'facebook', label: 'Facebook', bg: '#1877F2', fg: '#ffffff' },
  { key: 'discord', label: 'Discord', bg: '#5865F2', fg: '#ffffff' },
];

function Glyph({ p }: { p: Provider }) {
  if (p === 'google')
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
        <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 010-4.22V7.05H2.18a11 11 0 000 9.9l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
      </svg>
    );
  if (p === 'facebook')
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="#fff">
        <path d="M24 12a12 12 0 10-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0024 12z" />
      </svg>
    );
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="#fff">
      <path d="M20.32 4.37A19.8 19.8 0 0015.45 3l-.24.44a18.3 18.3 0 014.31 1.34 18.3 18.3 0 00-14.98 0A18.3 18.3 0 018.8 3.44L8.55 3a19.8 19.8 0 00-4.87 1.37C.6 8.9-.24 13.29.18 17.62A19.9 19.9 0 006.3 20.7l.5-.68a12.9 12.9 0 01-1.96-.94l.48-.36a14 14 0 0011.96 0l.48.36c-.62.37-1.28.68-1.97.94l.5.68a19.9 19.9 0 006.13-3.08c.5-5.02-.85-9.37-3.6-13.25zM8.02 15.33c-1.18 0-2.15-1.09-2.15-2.42s.95-2.43 2.15-2.43 2.17 1.1 2.15 2.43c0 1.33-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.43 2.15-2.43 2.17 1.1 2.15 2.43c0 1.33-.94 2.42-2.15 2.42z" />
    </svg>
  );
}

export function SocialButtons() {
  const supabase = getSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);

  const signIn = async (provider: Provider) => {
    setError(null);
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(null);
      setError('Provedor ainda não configurado no Supabase.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou continue com</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={busy != null}
            onClick={() => signIn(p.key)}
            aria-label={`Entrar com ${p.label}`}
            className="press flex min-h-11 items-center justify-center gap-2 rounded-md border border-border text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: p.bg, color: p.fg }}
          >
            <Glyph p={p.key} />
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>
      {error ? <p className="text-center text-xs text-status-broken">{error}</p> : null}
    </div>
  );
}
