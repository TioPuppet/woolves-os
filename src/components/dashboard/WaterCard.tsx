'use client';

import { ThiingsAsset } from '@/components/ThiingsAsset';

/** Water quick-log: current/goal, progress, and ≤3-tap +250/+500 ml buttons. */
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
  const pct = goalMl ? Math.min(100, Math.round((waterMl / goalMl) * 100)) : 0;
  const reached = goalMl != null && waterMl >= goalMl;

  return (
    <section className="rise flex flex-col gap-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="water" size={26} />
          <h2 className="text-sm font-semibold">Água</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          <span
            className={reached ? 'font-semibold text-primary' : 'font-semibold text-foreground'}
          >
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

      <div className="grid grid-cols-2 gap-3">
        {[250, 500].map((ml) => (
          <button
            key={ml}
            type="button"
            disabled={pending}
            onClick={() => onAdd(ml)}
            className="press min-h-11 cursor-pointer rounded-xl border border-border bg-muted/50 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            +{ml} ml
          </button>
        ))}
      </div>
    </section>
  );
}
