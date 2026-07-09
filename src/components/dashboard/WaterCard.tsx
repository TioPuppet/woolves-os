'use client';

import { useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

const PRESETS: { ml: number; label: string; title: string }[] = [
  { ml: 50, label: '+50', title: 'Gole' },
  { ml: 100, label: '+100', title: 'Dose' },
  { ml: 500, label: '+500', title: 'Poção' },
  { ml: 1000, label: '+1L', title: 'Elixir' },
];

/** Water quick-log: presets + custom amount, with add/remove (correction) mode. */
export function WaterCard({
  waterMl,
  goalMl,
  onAdd,
  onRemove,
  pending,
}: {
  waterMl: number;
  goalMl: number | null;
  onAdd: (ml: number) => void;
  onRemove: (ml: number) => void;
  pending: boolean;
}) {
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const pct = goalMl ? Math.min(100, Math.round((waterMl / goalMl) * 100)) : 0;
  const reached = goalMl != null && waterMl >= goalMl;

  const apply = (ml: number) => (mode === 'add' ? onAdd(ml) : onRemove(ml));
  const applyCustom = () => {
    const ml = Math.round(Number(custom));
    if (Number.isFinite(ml) && ml > 0) {
      apply(ml);
      setCustom('');
    }
  };

  return (
    <section className={cn('fitness-tile rise flex flex-col gap-4 rounded-[1.5rem] p-5', reached && 'water-complete')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-status-recovery/[0.10] ring-1 ring-status-recovery/20">
            <ThiingsAsset assetKey="water" size={36} />
          </div>
          <div>
            <h2 className="text-[11px] font-semibold uppercase text-muted-foreground">
              Mana hídrica
            </h2>
            <p className="mt-1 text-sm font-semibold">
              {reached ? 'Reservatório cheio' : 'Carregando atributo'}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-right text-sm text-muted-foreground">
          <span className={reached ? 'block font-semibold text-status-recovery' : 'block font-semibold text-foreground'}>
            {waterMl}
          </span>
          <span className="text-[11px]">{goalMl ? `/ ${goalMl} ml` : 'ml'}</span>
        </span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="water-fill h-full rounded-full bg-status-recovery transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.ml}
            type="button"
            onClick={() => apply(p.ml)}
            className={cn(
              'press min-h-[4.25rem] cursor-pointer rounded-2xl border text-center transition-colors',
              mode === 'add'
                ? 'border-status-recovery/20 bg-status-recovery/[0.08] hover:bg-status-recovery/[0.13]'
                : 'border-status-broken/20 bg-status-broken/[0.08] hover:bg-status-broken/[0.13]',
            )}
          >
            <span className="block text-[11px] font-semibold text-muted-foreground">
              {p.title}
            </span>
            <span className={cn('mt-1 block text-base font-bold', mode === 'add' ? 'text-status-recovery' : 'text-status-broken')}>
              {mode === 'add' ? p.label : p.label.replace('+', '-')}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {([
          { k: 'add', label: 'Adicionar' },
          { k: 'remove', label: 'Corrigir' },
        ] as const).map((o) => (
          <button
            key={o.k}
            type="button"
            onClick={() => setMode(o.k)}
            className={cn(
              'press min-h-9 flex-1 rounded-lg border text-xs font-semibold transition-colors',
              mode === o.k
                ? o.k === 'add'
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-status-broken/50 bg-status-broken/15 text-status-broken'
                : 'border-border text-muted-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
          placeholder="Outro valor (ml)"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          disabled={pending || !custom.trim()}
          onClick={applyCustom}
          className={cn(
            'press min-h-11 shrink-0 rounded-xl px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40',
            mode === 'add' ? 'bg-status-recovery' : 'bg-status-broken',
          )}
        >
          {mode === 'add' ? 'Adicionar' : 'Remover'}
        </button>
      </div>
    </section>
  );
}
