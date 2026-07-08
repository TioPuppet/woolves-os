'use client';

import { useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

const PRESETS: { ml: number; label: string }[] = [
  { ml: 50, label: '50 ml' },
  { ml: 100, label: '100 ml' },
  { ml: 500, label: '500 ml' },
  { ml: 1000, label: '1 L' },
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
    <section className="surface-2 rise flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="water" size={26} />
          <h2 className="text-sm font-semibold">Água</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          <span className={reached ? 'font-semibold text-primary' : 'font-semibold text-foreground'}>
            {waterMl}
          </span>
          {goalMl ? ` / ${goalMl} ml` : ' ml'}
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Modo: adicionar / remover (corrigir) */}
      <div className="flex gap-2">
        {([
          { k: 'add', label: 'Adicionar' },
          { k: 'remove', label: 'Remover' },
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

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.ml}
            type="button"
            onClick={() => apply(p.ml)}
            className="press min-h-11 cursor-pointer rounded-xl border border-border bg-muted/50 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {mode === 'add' ? '+' : '−'}{p.label}
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
            mode === 'add' ? 'bg-primary' : 'bg-status-broken',
          )}
        >
          {mode === 'add' ? 'Adicionar' : 'Remover'}
        </button>
      </div>
    </section>
  );
}
