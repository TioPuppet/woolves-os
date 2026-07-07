'use client';

import { useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

/** Compact weight quick-log + evolution (latest + trend vs previous). */
export function WeightCard({
  latest,
  prev,
  onLog,
  pending,
}: {
  latest: number | null;
  prev: number | null;
  onLog: (kg: number) => void;
  pending: boolean;
}) {
  const [weight, setWeight] = useState('');
  const delta =
    latest != null && prev != null
      ? Math.round((latest - prev) * 10) / 10
      : null;

  return (
    <section className="surface-2 flex flex-col gap-3 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="weight" size={26} />
          <h2 className="text-sm font-semibold">Peso</h2>
        </div>
        {latest != null ? (
          <span className="flex items-baseline gap-2">
            <span className="text-base font-semibold tabular-nums">
              {latest} kg
            </span>
            {delta != null && delta !== 0 ? (
              <span
                className={cn(
                  'text-xs font-medium',
                  delta < 0 ? 'text-status-ontrack' : 'text-status-atrisk',
                )}
              >
                {delta < 0 ? '▼' : '▲'} {Math.abs(delta)}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Sem registro</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Peso de hoje (kg)"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <button
          type="button"
          disabled={!(Number(weight) > 0) || pending}
          onClick={() => {
            onLog(Number(weight));
            setWeight('');
          }}
          className="press min-h-11 shrink-0 cursor-pointer rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Salvar
        </button>
      </div>
    </section>
  );
}
