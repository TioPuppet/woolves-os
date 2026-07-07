'use client';

import { useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';

const PRESETS: { ml: number; label: string }[] = [
  { ml: 50, label: '50 ml' },
  { ml: 100, label: '100 ml' },
  { ml: 500, label: '500 ml' },
  { ml: 1000, label: '1 L' },
];

/** Water quick-log: presets (50/100/500/1000 ml) + custom amount. */
export function WaterCard({
  waterMl,
  goalMl,
  onAdd,
  pending,
}: {
  waterMl: number;
  goalMl: number | null;
  onAdd: (ml: number) => void;
  pending: boolean;
}) {
  const [custom, setCustom] = useState('');
  const pct = goalMl ? Math.min(100, Math.round((waterMl / goalMl) * 100)) : 0;
  const reached = goalMl != null && waterMl >= goalMl;

  const addCustom = () => {
    const ml = Math.round(Number(custom));
    if (Number.isFinite(ml) && ml > 0) {
      onAdd(ml);
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

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.ml}
            type="button"
            disabled={pending}
            onClick={() => onAdd(p.ml)}
            className="press min-h-11 cursor-pointer rounded-xl border border-border bg-muted/50 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            +{p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Outro valor (ml)"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          disabled={pending || !custom.trim()}
          onClick={addCustom}
          className="press min-h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </section>
  );
}
