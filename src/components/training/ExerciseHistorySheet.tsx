'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Row {
  load_kg: number | null;
  reps: number | null;
  set_type: string;
  workout_sessions: { created_at: string; ref_date: string } | { created_at: string; ref_date: string }[] | null;
}

interface SessionPoint {
  date: string; // dd/mm
  bestLoad: number;
  volume: number;
}

function epley(load: number, reps: number): number {
  return Math.round(load * (1 + reps / 30));
}

export function ExerciseHistorySheet({
  open,
  exerciseId,
  exerciseName,
  onClose,
}: {
  open: boolean;
  exerciseId: number;
  exerciseName: string;
  onClose: () => void;
}) {
  const supabase = getSupabaseBrowserClient();

  const history = useQuery({
    queryKey: ['exercise-history', exerciseId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from('set_logs')
        .select('load_kg, reps, set_type, workout_sessions!inner(created_at, ref_date, completed)')
        .eq('exercise_id', exerciseId)
        .eq('workout_sessions.completed', true);
      return (data ?? []) as unknown as Row[];
    },
  });

  const { points, bestAll, e1rm } = useMemo(() => {
    const rows = history.data ?? [];
    const byDay = new Map<string, { ts: number; best: number; vol: number }>();
    let bestAll = 0;
    let e1rm = 0;
    for (const r of rows) {
      if (r.set_type !== 'work') continue;
      const s = Array.isArray(r.workout_sessions) ? r.workout_sessions[0] : r.workout_sessions;
      if (!s) continue;
      const load = r.load_kg ?? 0;
      const reps = r.reps ?? 0;
      const key = s.ref_date;
      const ts = new Date(s.created_at).getTime();
      const cur = byDay.get(key) ?? { ts, best: 0, vol: 0 };
      cur.best = Math.max(cur.best, load);
      cur.vol += reps * load;
      cur.ts = ts;
      byDay.set(key, cur);
      bestAll = Math.max(bestAll, load);
      if (load > 0 && reps > 0) e1rm = Math.max(e1rm, epley(load, reps));
    }
    const pts: SessionPoint[] = [...byDay.entries()]
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(-12)
      .map(([day, v]) => ({
        date: `${day.slice(8, 10)}/${day.slice(5, 7)}`,
        bestLoad: v.best,
        volume: Math.round(v.vol),
      }));
    return { points: pts, bestAll, e1rm };
  }, [history.data]);

  if (!open) return null;

  const maxVol = Math.max(1, ...points.map((p) => p.volume));
  const W = 320;
  const H = 120;
  const bw = points.length ? W / points.length : W;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="rise glass relative flex max-h-[85vh] w-full max-w-app flex-col rounded-t-3xl border border-border p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="min-w-0 truncate text-lg font-semibold">{exerciseName}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="press text-muted-foreground hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {history.isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Carregando…</p>
        ) : points.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Sem histórico ainda. Conclua treinos para ver a progressão.</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="surface-1 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-primary tabular-nums">{bestAll} kg</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Melhor carga</div>
              </div>
              <div className="surface-1 rounded-xl p-3 text-center">
                <div className="text-lg font-bold tabular-nums">{e1rm} kg</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">1RM estimado</div>
              </div>
            </div>

            <p className="mb-1 text-xs font-medium text-muted-foreground">Volume por treino (últimos {points.length})</p>
            <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="Gráfico de volume por treino">
              {points.map((p, i) => {
                const h = (p.volume / maxVol) * H;
                const x = i * bw + bw * 0.15;
                const w = bw * 0.7;
                return (
                  <g key={i}>
                    <rect x={x} y={H - h} width={w} height={h} rx={3} fill="hsl(var(--primary))" opacity={0.85} />
                    <text x={x + w / 2} y={H + 12} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
                      {p.date}
                    </text>
                    <text x={x + w / 2} y={H - h - 3} textAnchor="middle" fontSize="8" fill="hsl(var(--foreground))">
                      {p.bestLoad}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="mt-1 text-center text-[10px] text-muted-foreground">Número acima da barra = melhor carga (kg) daquele treino.</p>
          </>
        )}
      </div>
    </div>
  );
}
