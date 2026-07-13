'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { localDayString } from '@/lib/date';

const WELCOME_LINES = [
  {
    title: 'Entre como quem toma território.',
    body: 'O mundo premia o homem que sabe vender sua vontade para si mesmo: disciplina antes do conforto, estratégia antes do impulso, honra antes do aplauso.',
  },
  {
    title: 'Hoje não peça licença ao caos.',
    body: 'O lobo não vence por barulho; vence por fome, paciência e cálculo. Faça o necessário primeiro. O resto negocia depois.',
  },
  {
    title: 'Construa poder em silêncio.',
    body: 'Quem domina o próprio dia governa mais que um reino. Escolha a missão, pague o preço e deixe o resultado sentir sua presença.',
  },
  {
    title: 'A alcateia segue quem entrega.',
    body: 'Promessa sem execução é teatro. Hoje, venda menos desculpas para si mesmo e compre uma vitória concreta.',
  },
] as const;

function lineForDay(timezone: string) {
  const day = localDayString(timezone);
  const seed = day.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return WELCOME_LINES[seed % WELCOME_LINES.length] ?? WELCOME_LINES[0];
}

export function WelcomeGate({
  userId,
  timezone,
  name,
}: {
  userId: string;
  timezone: string;
  name: string;
}) {
  const [visible, setVisible] = useState(false);
  const storageKey = `woolves:welcome:${userId}:${localDayString(timezone)}`;
  const line = useMemo(() => lineForDay(timezone), [timezone]);

  useEffect(() => {
    const readSeen = () => {
      try {
        const localSeen = window.localStorage.getItem(storageKey) === 'seen';
        if (localSeen) return true;

        // Migrate the previous per-session flag so the welcome does not
        // unexpectedly reappear for users who already dismissed it today.
        const sessionSeen = window.sessionStorage.getItem(storageKey) === 'seen';
        if (sessionSeen) {
          window.localStorage.setItem(storageKey, 'seen');
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };

    try {
      setVisible(!readSeen());
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (visible) {
      document.documentElement.dataset.welcomeOpen = 'true';
    } else {
      delete document.documentElement.dataset.welcomeOpen;
    }
    return () => {
      delete document.documentElement.dataset.welcomeOpen;
    };
  }, [visible]);

  const enter = () => {
    try {
      window.localStorage.setItem(storageKey, 'seen');
    } catch {
      // Storage is only a convenience; entering the app must still work.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="welcome-gate fixed inset-0 z-[80] flex h-[100dvh] items-center justify-center overflow-y-auto bg-background px-5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(46_67%_47%/0.22),transparent_34%),radial-gradient(circle_at_82%_18%,hsl(252_96%_68%/0.12),transparent_30%),linear-gradient(180deg,hsl(240_12%_4%),hsl(240_18%_3%))]" />
      <div className="absolute left-1/2 top-8 h-px w-[78vw] max-w-sm -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="relative flex w-full max-w-app flex-col items-center py-5 text-center sm:py-8">
        <div className="mb-5 grid h-28 w-28 place-items-center rounded-full border border-primary/25 bg-primary/5 shadow-[0_0_80px_-28px_hsl(46_67%_47%/0.8)] sm:mb-7 sm:h-36 sm:w-36">
          <ThiingsAsset assetKey="wolf-obsidian" size={112} alt="Woolves" />
        </div>

        <p className="mb-2 text-[11px] font-semibold uppercase text-primary sm:mb-3">
          Woolves Life OS
        </p>
        <h1 id="welcome-title" className="max-w-[20rem] text-balance text-2xl font-semibold leading-tight sm:text-3xl">
          {line.title}
        </h1>
        <p className="mt-3 max-w-[22rem] text-balance text-sm leading-5 text-muted-foreground sm:mt-5 sm:leading-6">
          {line.body}
        </p>

        <div className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left sm:mt-8">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Comando do dia
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {name}, escolha uma missão pequena o bastante para começar e séria o bastante para mudar o rumo.
          </p>
        </div>

        <button
          type="button"
          onClick={enter}
          className="press mt-5 min-h-12 w-full rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_48px_-24px_hsl(46_67%_47%/0.85)] sm:mt-7"
        >
          Entrar no dia
        </button>
      </div>
    </section>
  );
}
