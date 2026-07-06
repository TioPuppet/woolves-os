'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PlanExercise, SetLog, LastPerf } from '@/lib/training';
import { CURATED_TECHNIQUES } from '@/lib/techniques';
import { muscleAssetKey, muscleLabel } from '@/lib/muscles';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

interface CustomTechnique {
  id: number;
  name: string;
}

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
  planExercise,
  sets,
  techniques,
  onLog,
  onDeleteSet,
  onAddTechnique,
  onDeleteTechnique,
  logging,
}: {
  planExercise: PlanExercise;
  sets: SetLog[];
  techniques: CustomTechnique[];
  onLog: (v: {
    exerciseId: number;
    setNo: number;
    reps: number | null;
    loadKg: number | null;
    rpe: number | null;
    technique: string | null;
  }) => void;
  onDeleteSet: (id: number) => void;
  onAddTechnique: (name: string) => void;
  onDeleteTechnique: (id: number) => void;
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
  const [technique, setTechnique] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  const perfText = lastPerf.data ? summarizePerf(lastPerf.data) : null;
  const canAdd = reps.trim() !== '' || load.trim() !== '';

  const customNames = useMemo(
    () => new Set(techniques.map((t) => t.name)),
    [techniques],
  );

  const reset = () => {
    setReps('');
    setLoad('');
    setRpe('');
  };

  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset
          assetKey={muscleAssetKey(planExercise.exercise.muscle_group)}
          size={22}
        />
        <span className="text-sm font-semibold">{planExercise.exercise.name}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        {perfText ? `Última vez: ${perfText}` : 'Primeira vez neste exercício.'}
      </p>

      {sets.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {sets.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 text-sm tabular-nums"
            >
              <span className="w-6 text-muted-foreground">{s.set_no}ª</span>
              <span>{s.reps ?? '—'} reps</span>
              <span>{s.load_kg ?? '—'} kg</span>
              <span className="text-muted-foreground">RPE {s.rpe ?? '—'}</span>
              {s.technique ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {s.technique}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onDeleteSet(s.id)}
                aria-label="Remover série"
                className="ml-auto text-muted-foreground hover:text-status-broken"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Technique chips */}
      <div className="flex flex-wrap gap-1.5">
        {CURATED_TECHNIQUES.map((t) => (
          <TechChip
            key={t}
            label={t}
            active={technique === t}
            onClick={() => setTechnique(technique === t ? null : t)}
          />
        ))}
        {techniques.map((t) => (
          <TechChip
            key={t.id}
            label={t.name}
            active={technique === t.name}
            onClick={() => setTechnique(technique === t.name ? null : t.name)}
            onDelete={() => onDeleteTechnique(t.id)}
          />
        ))}
        {customOpen ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="técnica"
              className="min-h-7 w-24 rounded-full border border-border bg-card px-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <button
              type="button"
              onClick={() => {
                const n = customName.trim();
                if (n && !customNames.has(n)) onAddTechnique(n);
                setCustomName('');
                setCustomOpen(false);
              }}
              className="text-[11px] font-semibold text-primary"
            >
              ok
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            + técnica
          </button>
        )}
      </div>

      {/* Set inputs */}
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="reps" className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <input type="number" inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} placeholder="kg" className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <input type="number" inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="RPE" className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <button
          type="button"
          disabled={logging || !canAdd}
          onClick={() => {
            onLog({
              exerciseId: exId,
              setNo: sets.length + 1,
              reps: reps === '' ? null : Number(reps),
              loadKg: load === '' ? null : Number(load),
              rpe: rpe === '' ? null : Number(rpe),
              technique,
            });
            reset();
          }}
          className="press min-h-10 cursor-pointer rounded-lg bg-primary px-3 text-lg font-semibold leading-none text-primary-foreground disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TechChip({
  label,
  active,
  onClick,
  onDelete,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        active
          ? 'border-primary/50 bg-primary/15 text-primary'
          : 'border-border text-muted-foreground',
      )}
    >
      <button type="button" onClick={onClick} className="cursor-pointer">
        {label}
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Excluir ${label}`}
          className="text-muted-foreground hover:text-status-broken"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

export function SessionView({
  sessionId,
  exercises,
  userId,
  onComplete,
}: {
  sessionId: number;
  exercises: PlanExercise[];
  userId: string;
  onComplete: () => void;
}) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const sessionSets = useQuery({
    queryKey: ['session-sets', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('set_logs')
        .select('id, exercise_id, set_no, reps, load_kg, rpe, technique')
        .eq('session_id', sessionId)
        .order('set_no');
      return (data ?? []) as SetLog[];
    },
  });

  const techniques = useQuery({
    queryKey: ['techniques'],
    queryFn: async () => {
      const { data } = await supabase
        .from('techniques')
        .select('id, name')
        .order('name');
      return (data ?? []) as CustomTechnique[];
    },
  });

  const logSet = useMutation({
    mutationFn: async (v: {
      exerciseId: number;
      setNo: number;
      reps: number | null;
      loadKg: number | null;
      rpe: number | null;
      technique: string | null;
    }) => {
      const { error } = await supabase.from('set_logs').insert({
        session_id: sessionId,
        exercise_id: v.exerciseId,
        set_no: v.setNo,
        reps: v.reps,
        load_kg: v.loadKg,
        rpe: v.rpe,
        technique: v.technique,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['session-sets', sessionId] }),
  });

  const deleteSet = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('set_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['session-sets', sessionId] }),
  });

  const addTechnique = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('techniques')
        .insert({ user_id: userId, name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['techniques'] }),
  });

  const deleteTechnique = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('techniques').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['techniques'] }),
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
  const custom = techniques.data ?? [];

  // Group exercises by muscle group, preserving plan order.
  const groups: { key: string; items: PlanExercise[] }[] = [];
  for (const pe of exercises) {
    const g = pe.exercise.muscle_group ?? 'outros';
    const found = groups.find((x) => x.key === g);
    if (found) found.items.push(pe);
    else groups.push({ key: g, items: [pe] });
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((grp) => (
        <div key={grp.key} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ThiingsAsset assetKey={muscleAssetKey(grp.key)} size={26} />
            <h3 className="text-base font-semibold">{muscleLabel(grp.key)}</h3>
          </div>
          {grp.items.map((pe) => (
            <ExerciseBlock
              key={pe.id}
              planExercise={pe}
              sets={allSets.filter((s) => s.exercise_id === pe.exercise_id)}
              techniques={custom}
              onLog={(v) => logSet.mutate(v)}
              onDeleteSet={(id) => deleteSet.mutate(id)}
              onAddTechnique={(name) => addTechnique.mutate(name)}
              onDeleteTechnique={(id) => deleteTechnique.mutate(id)}
              logging={logSet.isPending}
            />
          ))}
        </div>
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
