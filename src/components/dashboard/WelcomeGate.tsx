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
    try {
      setVisible(sessionStorage.getItem(storageKey) !== 'seen');
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  const enter = () => {
    try {
      sessionStorage.setItem(storageKey, 'seen');
    } catch {
      // Session storage is only a convenience; entering the app must still work.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className="fixed inset-0 z-[80] flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(46_67%_47%/0.22),transparent_34%),radial-gradient(circle_at_82%_18%,hsl(252_96%_68%/0.12),transparent_30%),linear-gradient(180deg,hsl(240_12%_4%),hsl(240_18%_3%))]" />
      <div className="absolute left-1/2 top-8 h-px w-[78vw] max-w-sm -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="relative flex w-full max-w-app flex-col items-center text-center">
        <div className="mb-7 grid h-36 w-36 place-items-center rounded-full border border-primary/25 bg-primary/5 shadow-[0_0_80px_-28px_hsl(46_67%_47%/0.8)]">
          <ThiingsAsset assetKey="wolf-obsidian" size={112} alt="Woolves" />
        </div>

        <p className="mb-3 text-[11px] font-semibold uppercase text-primary">
          Woolves Life OS
        </p>
        <h1 className="max-w-[18rem] text-balance text-3xl font-semibold leading-tight">
          {line.title}
        </h1>
        <p className="mt-5 max-w-[20rem] text-balance text-sm leading-6 text-muted-foreground">
          {line.body}
        </p>

        <div className="mt-8 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
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
          className="press mt-7 min-h-12 w-full rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_48px_-24px_hsl(46_67%_47%/0.85)]"
        >
          Entrar no dia
        </button>
      </div>
    </section>
  );
}
