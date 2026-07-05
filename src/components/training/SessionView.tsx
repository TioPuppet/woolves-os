'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PlanExercise, SetLog, LastPerf } from '@/lib/training';
import { ThiingsAsset } from '@/components/ThiingsAsset';

function summarizePerf(rows: LastPerf[]): string | null {
  if (!rows.length) return null;
  const top = rows.reduce((a, b) => ((b.load_kg ?? 0) > (a.load_kg ?? 0) ? b : a));
  const parts = [`${rows.length} série${rows.length > 1 ? 's' : ''}`];
  if (top.reps != null) parts.push(`${top.reps} reps`);
  if (top.load_kg != null) parts.push(`${top.load_kg}kg`);
  if (top.rpe != null) parts.push(`RPE ${top.rpe}`);
  return parts.join(' · ');
}

function ExerciseBlock({
  sessionId,
  planExercise,
  sets,
  onLog,
  logging,
}: {
  sessionId: number;
  planExercise: PlanExercise;
  sets: SetLog[];
  onLog: (v: {
    exerciseId: number;
    setNo: number;
    reps: number | null;
    loadKg: number | null;
    rpe: number | null;
  }) => void;
  logging: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const exId = planExercise.exercise_id;

  const lastPerf = useQuery({
    queryKey: ['last-perf', exId],
    queryFn: async () => {
      const { data } = await supabase.rpc('last_exercise_performance', {
        p_exercise_id: exId,
      });
      return (data ?? []) as LastPerf[];
    },
  });

  const [reps, setReps] = useState('');
  const [load, setLoad] = useState('');
  const [rpe, setRpe] = useState('');

  const perfText = lastPerf.data ? summarizePerf(lastPerf.data) : null;

  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset assetKey="calories" size={22} />
        <span className="text-sm font-semibold">{planExercise.exercise.name}</span>
      </div>

      {perfText ? (
        <p className="text-xs text-muted-foreground">Última vez: {perfText}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Primeira vez neste exercício.</p>
      )}

      {sets.length > 0 ? (
        <div className="flex flex-col gap-1">
          {sets.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm tabular-nums">
              <span className="w-6 text-muted-foreground">{s.set_no}ª</span>
              <span>{s.reps ?? '—'} reps</span>
              <span>{s.load_kg ?? '—'} kg</span>
              <span className="text-muted-foreground">RPE {s.rpe ?? '—'}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="reps"
          className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <input
          type="number"
          inputMode="decimal"
          value={load}
          onChange={(e) => setLoad(e.target.value)}
          placeholder="kg"
          className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <input
          type="number"
          inputMode="decimal"
          value={rpe}
          onChange={(e) => setRpe(e.target.value)}
          placeholder="RPE"
          className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <button
          type="button"
          disabled={logging}
          onClick={() => {
            onLog({
              exerciseId: exId,
              setNo: sets.length + 1,
              reps: reps === '' ? null : Number(reps),
              loadKg: load === '' ? null : Number(load),
              rpe: rpe === '' ? null : Number(rpe),
            });
            setReps('');
            setLoad('');
            setRpe('');
          }}
          className="press min-h-10 cursor-pointer rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SessionView({
  sessionId,
  exercises,
  onComplete,
}: {
  sessionId: number;
  exercises: PlanExercise[];
  onComplete: () => void;
}) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const sessionSets = useQuery({
    queryKey: ['session-sets', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('set_logs')
        .select('id, exercise_id, set_no, reps, load_kg, rpe')
        .eq('session_id', sessionId)
        .order('set_no');
      return (data ?? []) as SetLog[];
    },
  });

  const logSet = useMutation({
    mutationFn: async (v: {
      exerciseId: number;
      setNo: number;
      reps: number | null;
      loadKg: number | null;
      rpe: number | null;
    }) => {
      const { error } = await supabase.from('set_logs').insert({
        session_id: sessionId,
        exercise_id: v.exerciseId,
        set_no: v.setNo,
        reps: v.reps,
        load_kg: v.loadKg,
        rpe: v.rpe,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['session-sets', sessionId] }),
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('complete_session', {
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today'] });
      onComplete();
    },
  });

  const allSets = sessionSets.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {exercises.map((pe) => (
        <ExerciseBlock
          key={pe.id}
          sessionId={sessionId}
          planExercise={pe}
          sets={allSets.filter((s) => s.exercise_id === pe.exercise_id)}
          onLog={(v) => logSet.mutate(v)}
          logging={logSet.isPending}
        />
      ))}

      <button
        type="button"
        disabled={complete.isPending}
        onClick={() => complete.mutate()}
        className="press min-h-12 w-full cursor-pointer rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {complete.isPending ? 'Concluindo…' : 'Concluir treino (+50 EXP)'}
      </button>
    </div>
  );
}
