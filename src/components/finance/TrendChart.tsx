'use client';

import type { TrendPoint } from '@/lib/finance';

/** 6-month income vs expense bars (Wallet/Mobills-style cash-flow trend). */
export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const max = Math.max(1, ...trend.map((p) => Math.max(p.income, p.expense)));
  const W = 320;
  const H = 90;
  const slot = trend.length ? W / trend.length : W;
  const bw = Math.min(14, slot * 0.32);

  return (
    <section className="surface-2 flex flex-col gap-2 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Tendência (6 meses)
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-status-ontrack" />Receita
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-status-broken" />Despesa
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" role="img" aria-label="Tendência de receita e despesa">
        {trend.map((p, i) => {
          const cx = i * slot + slot / 2;
          const ih = (p.income / max) * H;
          const eh = (p.expense / max) * H;
          return (
            <g key={p.ym}>
              <rect x={cx - bw - 1} y={H - ih} width={bw} height={ih} rx={2} fill="hsl(var(--status-ontrack))" opacity={0.9} />
              <rect x={cx + 1} y={H - eh} width={bw} height={eh} rx={2} fill="hsl(var(--status-broken))" opacity={0.9} />
              <text x={cx} y={H + 12} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
