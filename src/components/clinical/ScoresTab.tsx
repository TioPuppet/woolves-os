'use client';

import { useState } from 'react';
import { SCORES, scoreTotal, type ClinicalScore } from '@/lib/clinical/scores';

function ScoreCard({ score }: { score: ClinicalScore }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const total = scoreTotal(score.items, selected);
  const band = score.interpret(total);

  const toggle = (k: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <section className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div>
        <h3 className="text-sm font-semibold">{score.name}</h3>
        <p className="text-xs text-muted-foreground">{score.subtitle}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        {score.items.map((it) => {
          const on = selected.has(it.key);
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => toggle(it.key)}
              className="press flex items-center gap-2.5 rounded-lg px-1 py-1 text-left"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                style={{
                  borderColor: on ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  backgroundColor: on ? 'hsl(var(--primary))' : 'transparent',
                }}
              >
                {on && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12l5 5L20 6" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1 text-sm">{it.label}</span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                {it.points > 0 ? `+${it.points}` : it.points}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl px-4 py-3" style={{ backgroundColor: `hsl(${band.tone} / 0.12)` }}>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold" style={{ color: `hsl(${band.tone})` }}>
            {band.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: `hsl(${band.tone})` }}>
          {band.note}
        </p>
      </div>
    </section>
  );
}

export function ScoresTab() {
  return (
    <div className="flex flex-col gap-3">
      {SCORES.map((s) => (
        <ScoreCard key={s.key} score={s} />
      ))}
    </div>
  );
}
