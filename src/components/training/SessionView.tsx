'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type PlanExercise, type SetLog, type LastPerf, isCardioGroup } from '@/lib/training';
import { CURATED_TECHNIQUES } from '@/lib/techniques';
import { muscleAssetKey, muscleLabel } from '@/lib/muscles';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { startRest, clearRest } from '@/lib/rest-timer';
import { cn } from '@/lib/utils';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import {
  activityMetricLabels,
  getTrainingModality,
  type ActivityMetric,
} from '@/lib/training-modalities';

const REST_DEFAULT = 90;

interface CustomTechnique {
  id: number;
  name: string;
}

interface LogPayload {
  exerciseId: number;
  setNo: number;
  reps: number | null;
  loadKg: number | null;
  rpe: number | null;
  technique: string | null;
  setType: string;
  durationMin: number | null;
  distanceKm: number | null;
  rounds: number | null;
  activityMeta: Record<string, unknown>;
  notes: string | null;
}

type TrainingDifficulty = 'Leve' | 'Firme' | 'Brutal';

export interface WorkoutSummary {
  durationSec: number;
  sets: number;
  exp: number;
  difficulty: TrainingDifficulty;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function feedback() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(120);
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

/* ------------------------------------------------------------- Cardio ------ */

function CardioBlock({
  planExercise,
  sets,
  onLog,
  onDeleteSet,
}: {
  planExercise: PlanExercise;
  sets: SetLog[];
  onLog: (v: LogPayload) => void;
  onDeleteSet: (id: number) => void;
}) {
  const exId = planExercise.exercise_id;
  const modality = getTrainingModality(planExercise.exercise.name);
  const metrics = new Set<ActivityMetric>(modality.metrics);
  const [dur, setDur] = useState('');
  const [dist, setDist] = useState('');
  const [rounds, setRounds] = useState('');
  const [rpe, setRpe] = useState('');
  const [poolLength, setPoolLength] = useState('');
  const [notes, setNotes] = useState('');
  const canAdd = [dur, dist, rounds, rpe, notes].some((value) => value.trim() !== '');

  const inputClass = 'min-h-10 min-w-0 rounded-lg border border-border bg-card px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60';
  const show = (metric: ActivityMetric) => metrics.has(metric);

  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset assetKey={modality.icon} size={34} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{planExercise.exercise.name}</span>
        <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[10px] font-bold uppercase text-[hsl(211_90%_58%)]">
          Cardio
        </span>
      </div>

      {sets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {sets.map((s) => {
            const pace = s.duration_min && s.distance_km ? s.duration_min / s.distance_km : null;
            return (
              <div key={s.id} className="flex items-center gap-2 text-sm tabular-nums">
                <span className="w-5 shrink-0 text-xs text-muted-foreground">{s.set_no}ª</span>
                {s.duration_min != null && <span className="shrink-0">{s.duration_min}<span className="text-xs text-muted-foreground"> min</span></span>}
                {s.distance_km != null && <span className="shrink-0">{s.distance_km}<span className="text-xs text-muted-foreground"> km</span></span>}
                {s.rounds != null && <span className="shrink-0">{s.rounds}<span className="text-xs text-muted-foreground"> rounds</span></span>}
                {s.rpe != null && <span className="shrink-0 text-xs text-muted-foreground">RPE {s.rpe}</span>}
                {pace != null && <span className="shrink-0 text-xs text-muted-foreground">{pace.toFixed(1)} min/km</span>}
                <button type="button" onClick={() => onDeleteSet(s.id)} aria-label="Remover" className="ml-auto shrink-0 text-muted-foreground hover:text-status-broken">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{modality.hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {modality.metrics.map((metric) => (
          <span
            key={metric}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
          >
            {activityMetricLabels[metric]}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {show('duration') ? <input type="number" min="0" step="0.1" inputMode="decimal" value={dur} onChange={(e) => setDur(e.target.value)} placeholder="Duração (min)" className={inputClass} /> : null}
        {show('distance') ? <input type="number" min="0" step="0.01" inputMode="decimal" value={dist} onChange={(e) => setDist(e.target.value)} placeholder="Distância (km)" className={inputClass} /> : null}
        {show('rounds') ? <input type="number" min="0" step="1" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value)} placeholder="Rounds/blocos" className={inputClass} /> : null}
        {show('rpe') ? <input type="number" min="0" max="10" step="0.5" inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="Intensidade (RPE)" className={inputClass} /> : null}
        {show('poolLength') ? <input type="number" min="0" step="1" inputMode="numeric" value={poolLength} onChange={(e) => setPoolLength(e.target.value)} placeholder="Piscina (m)" className={inputClass} /> : null}
      </div>

      {show('notes') ? <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações da sessão" rows={2} className="min-h-16 resize-none rounded-lg border border-border bg-card px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" /> : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            onLog({
              exerciseId: exId,
              setNo: sets.length + 1,
              reps: null,
              loadKg: null,
              rpe: rpe === '' ? null : Number(rpe),
              technique: null,
              setType: 'work',
              durationMin: dur === '' ? null : Number(dur),
              distanceKm: dist === '' ? null : Number(dist),
              rounds: rounds === '' ? null : Number(rounds),
              activityMeta: poolLength === '' ? {} : { pool_length_m: Number(poolLength) },
              notes: notes.trim() === '' ? null : notes.trim(),
            });
            setDur('');
            setDist('');
            setRounds('');
            setRpe('');
            setPoolLength('');
            setNotes('');
          }}
          className="press min-h-10 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Registrar sessão
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Strength ------ */

function ExerciseBlock({
  userId,
  planExercise,
  sets,
  techniques,
  onLog,
  onDeleteSet,
  onAddTechnique,
  onDeleteTechnique,
  logging,
}: {
  userId: string;
  planExercise: PlanExercise;
  sets: SetLog[];
  techniques: CustomTechnique[];
  onLog: (v: LogPayload) => void;
  onDeleteSet: (id: number) => void;
  onAddTechnique: (name: string) => void;
  onDeleteTechnique: (id: number) => void;
  logging: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const exId = planExercise.exercise_id;

  const lastPerf = useQuery({
    queryKey: ['last-perf', userId, exId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('last_exercise_performance', { p_exercise_id: exId });
      throwIfSupabaseError(error, 'lastExercisePerformance');
      return (data ?? []) as LastPerf[];
    },
  });

  const [reps, setReps] = useState('');
  const [load, setLoad] = useState('');
  const [rpe, setRpe] = useState('');
  const [setType, setSetType] = useState<'work' | 'warmup'>('work');
  const [technique, setTechnique] = useState<string | null>(planExercise.technique ?? null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  const perfText = lastPerf.data ? summarizePerf(lastPerf.data) : null;
  const prevBest = useMemo(() => Math.max(0, ...(lastPerf.data ?? []).map((r) => r.load_kg ?? 0)), [lastPerf.data]);

  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current) return;
    if (sets.length > 0) {
      prefilled.current = true;
      return;
    }
    const lp = lastPerf.data;
    if (lp && lp.length) {
      const top = lp.reduce((a, b) => ((b.load_kg ?? 0) > (a.load_kg ?? 0) ? b : a));
      if (top.reps != null) setReps(String(top.reps));
      if (top.load_kg != null) setLoad(String(top.load_kg));
      prefilled.current = true;
    }
  }, [lastPerf.data, sets.length]);

  const canAdd = reps.trim() !== '' || load.trim() !== '';
  // Conta TODAS as séries (trabalho + aquecimento).
  const doneCount = sets.length;
  const target = planExercise.target_sets;
  const customNames = useMemo(() => new Set(techniques.map((t) => t.name)), [techniques]);

  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset assetKey={muscleAssetKey(planExercise.muscle_group ?? planExercise.exercise.muscle_group)} size={30} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{planExercise.exercise.name}</span>
        <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {doneCount}
          {target ? `/${target}` : ''} séries
        </span>
      </div>

      {planExercise.target_sets || planExercise.target_reps || planExercise.rest_seconds || planExercise.technique ? (
        <p className="text-xs font-medium text-primary">
          Meta:{' '}
          {[
            planExercise.target_sets && planExercise.target_reps
              ? `${planExercise.target_sets}×${planExercise.target_reps}`
              : planExercise.target_sets
                ? `${planExercise.target_sets} séries`
                : planExercise.target_reps
                  ? `${planExercise.target_reps} reps`
                  : null,
            planExercise.rest_seconds ? `${planExercise.rest_seconds}s desc.` : null,
            planExercise.technique,
          ].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">{perfText ? `Última vez: ${perfText}` : 'Primeira vez neste exercício.'}</p>

      {sets.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {sets.map((s) => {
            const isPR = s.set_type === 'work' && s.load_kg != null && prevBest > 0 && s.load_kg > prevBest;
            return (
              <div key={s.id} className="flex items-center gap-2 text-sm tabular-nums">
                <span className="w-5 shrink-0 text-xs text-muted-foreground">{s.set_no}ª</span>
                {s.set_type === 'warmup' ? (
                  <span className="shrink-0 rounded bg-streak/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-streak">Aquec</span>
                ) : null}
                <span className="shrink-0">{s.reps ?? '—'}<span className="text-xs text-muted-foreground"> reps</span></span>
                <span className="shrink-0">{s.load_kg ?? '—'}<span className="text-xs text-muted-foreground"> kg</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">RPE {s.rpe ?? '—'}</span>
                {isPR ? <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">PR</span> : null}
                {s.technique ? <span className="min-w-0 truncate rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">{s.technique}</span> : null}
                <button type="button" onClick={() => onDeleteSet(s.id)} aria-label="Remover série" className="ml-auto shrink-0 text-muted-foreground hover:text-status-broken">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {CURATED_TECHNIQUES.map((t) => (
          <TechChip key={t} label={t} active={technique === t} onClick={() => setTechnique(technique === t ? null : t)} />
        ))}
        {techniques.map((t) => (
          <TechChip key={t.id} label={t.name} active={technique === t.name} onClick={() => setTechnique(technique === t.name ? null : t.name)} onDelete={() => onDeleteTechnique(t.id)} />
        ))}
        {customOpen ? (
          <span className="inline-flex items-center gap-1">
            <input autoFocus value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="técnica" className="min-h-7 w-24 rounded-full border border-border bg-card px-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/60" />
            <button type="button" onClick={() => { const n = customName.trim(); if (n && !customNames.has(n)) onAddTechnique(n); setCustomName(''); setCustomOpen(false); }} className="text-[11px] font-semibold text-primary">ok</button>
          </span>
        ) : (
          <button type="button" onClick={() => setCustomOpen(true)} className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">+ técnica</button>
        )}
      </div>

      <div className="flex gap-1.5">
        {(['work', 'warmup'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setSetType(t)} className={cn('press rounded-full border px-3 py-1 text-[11px] font-medium transition-colors', setType === t ? (t === 'warmup' ? 'border-streak/50 bg-streak/15 text-streak' : 'border-primary/50 bg-primary/15 text-primary') : 'border-border text-muted-foreground')}>
            {t === 'work' ? 'Trabalho' : 'Aquecimento'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="reps" className="min-h-10 min-w-0 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <input type="number" inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} placeholder="kg" className="min-h-10 min-w-0 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <input type="number" inputMode="decimal" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="RPE" className="min-h-10 min-w-0 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
        <button
          type="button"
          disabled={logging || !canAdd}
          onClick={() => {
            const loadNum = load === '' ? null : Number(load);
            onLog({
              exerciseId: exId,
              setNo: sets.length + 1,
              reps: reps === '' ? null : Number(reps),
              loadKg: loadNum,
              rpe: rpe === '' ? null : Number(rpe),
              technique,
              setType,
              durationMin: null,
              distanceKm: null,
              rounds: null,
              activityMeta: {},
              notes: null,
            });
            if (loadNum != null && prevBest > 0 && loadNum > prevBest) feedback();
            setRpe('');
            startRest(planExercise.rest_seconds ?? REST_DEFAULT);
          }}
          className="press min-h-10 rounded-lg bg-primary px-3 text-lg font-semibold leading-none text-primary-foreground disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function TechChip({ label, active, onClick, onDelete }: { label: string; active: boolean; onClick: () => void; onDelete?: () => void }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium', active ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground')}>
      <button type="button" onClick={onClick} className="cursor-pointer">{label}</button>
      {onDelete ? (
        <button type="button" onClick={onDelete} aria-label={`Excluir ${label}`} className="text-muted-foreground hover:text-status-broken">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
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
  onCancel,
}: {
  sessionId: number;
  exercises: PlanExercise[];
  userId: string;
  onComplete: (summary: WorkoutSummary) => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const sessionSets = useQuery({
    queryKey: ['session-sets', userId, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('set_logs')
        .select('id, exercise_id, set_no, reps, load_kg, rpe, technique, set_type, duration_min, distance_km, rounds, notes, activity_meta')
        .eq('session_id', sessionId)
        .order('set_no');
      throwIfSupabaseError(error, 'sessionSets');
      return (data ?? []) as SetLog[];
    },
  });

  const sessionMeta = useQuery({
    queryKey: ['session-meta', userId, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('workout_sessions').select('created_at').eq('id', sessionId).maybeSingle();
      throwIfSupabaseError(error, 'sessionMeta');
      return (data as { created_at: string } | null) ?? null;
    },
  });

  const techniques = useQuery({
    queryKey: ['techniques', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('techniques').select('id, name').order('name');
      throwIfSupabaseError(error, 'techniques');
      return (data ?? []) as CustomTechnique[];
    },
  });

  const [now, setNow] = useState(() => Date.now());
  const [finishOpen, setFinishOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<TrainingDifficulty>('Firme');
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const logSet = useMutation({
    mutationFn: async (v: LogPayload) => {
      const { error } = await supabase.from('set_logs').insert({
        session_id: sessionId,
        exercise_id: v.exerciseId,
        set_no: v.setNo,
        reps: v.reps,
        load_kg: v.loadKg,
        rpe: v.rpe,
        technique: v.technique,
        set_type: v.setType,
        duration_min: v.durationMin,
        distance_km: v.distanceKm,
        rounds: v.rounds,
        notes: v.notes,
        activity_meta: v.activityMeta,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-sets', userId, sessionId] }),
  });

  const deleteSet = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('set_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-sets', userId, sessionId] }),
  });

  const addTechnique = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('techniques').insert({ user_id: userId, name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['techniques', userId] }),
  });

  const deleteTechnique = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('techniques').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['techniques', userId] }),
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('complete_session', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: () => {
      clearRest();
      qc.removeQueries({ queryKey: ['session-sets', userId, sessionId] });
      qc.removeQueries({ queryKey: ['session-meta', userId, sessionId] });
      qc.invalidateQueries({ queryKey: ['last-perf'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      onComplete(summary);
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      clearRest();
      qc.removeQueries({ queryKey: ['session-sets', userId, sessionId] });
      qc.invalidateQueries({ queryKey: ['plans'] });
      onCancel();
    },
  });

  const allSets = sessionSets.data ?? [];
  const custom = techniques.data ?? [];
  const startedAt = sessionMeta.data?.created_at ? new Date(sessionMeta.data.created_at).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : null;
  const summary: WorkoutSummary = {
    durationSec: elapsed ?? 0,
    sets: allSets.length,
    exp: 50,
    difficulty,
  };

  const groups: { key: string; items: PlanExercise[] }[] = [];
  for (const pe of exercises) {
    const g = pe.muscle_group ?? pe.exercise.muscle_group ?? 'outros';
    const found = groups.find((x) => x.key === g);
    if (found) found.items.push(pe);
    else groups.push({ key: g, items: [pe] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="surface-1 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
        <div>
          <div className="text-lg font-bold tabular-nums">{elapsed != null ? fmt(elapsed) : '—'}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tempo</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">{allSets.length}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Séries</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">+{summary.exp}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">EXP</div>
        </div>
      </div>

      {groups.map((grp) => (
        <div key={grp.key} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ThiingsAsset assetKey={muscleAssetKey(grp.key)} size={26} />
            <h3 className="text-base font-semibold">{muscleLabel(grp.key)}</h3>
          </div>
          {grp.items.map((pe) => {
            const cardio = isCardioGroup(pe.muscle_group ?? pe.exercise.muscle_group);
            const setsFor = allSets.filter((s) => s.exercise_id === pe.exercise_id);
            return cardio ? (
              <CardioBlock key={pe.id} planExercise={pe} sets={setsFor} onLog={(v) => logSet.mutate(v)} onDeleteSet={(id) => deleteSet.mutate(id)} />
            ) : (
              <ExerciseBlock
                key={pe.id}
                userId={userId}
                planExercise={pe}
                sets={setsFor}
                techniques={custom}
                onLog={(v) => logSet.mutate(v)}
                onDeleteSet={(id) => deleteSet.mutate(id)}
                onAddTechnique={(name) => addTechnique.mutate(name)}
                onDeleteTechnique={(id) => deleteTechnique.mutate(id)}
                logging={logSet.isPending}
              />
            );
          })}
        </div>
      ))}

      {finishOpen ? (
        <section className="training-finish rounded-[1.75rem] border border-white/[0.08] p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] ring-1 ring-primary/20">
              <ThiingsAsset assetKey="trophy" size={44} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Encerrar arena
              </p>
              <h2 className="mt-1 text-xl font-semibold leading-tight">
                Confirmar treino concluído
              </h2>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Como foi a arena?
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Marque a intensidade real antes de selar o treino.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['Leve', 'Firme', 'Brutal'] as TrainingDifficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={cn(
                    'press min-h-10 rounded-xl border text-xs font-semibold transition',
                    difficulty === level
                      ? 'border-primary/45 bg-primary/15 text-primary'
                      : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <FinishMetric label="Tempo" value={fmt(summary.durationSec)} />
            <FinishMetric label="Séries" value={String(summary.sets)} />
            <FinishMetric label="Dificuldade" value={summary.difficulty} />
            <FinishMetric label="EXP" value={`+${summary.exp}`} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFinishOpen(false)}
              className="press min-h-11 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-muted-foreground"
            >
              Continuar
            </button>
            <button
              type="button"
              disabled={complete.isPending}
              onClick={() => complete.mutate()}
              className="press min-h-11 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {complete.isPending ? 'Concluindo…' : 'Finalizar'}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          disabled={complete.isPending}
          onClick={() => setFinishOpen(true)}
          className="press min-h-12 w-full cursor-pointer rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          Concluir treino (+50 EXP)
        </button>
      )}

      <button
        type="button"
        disabled={cancel.isPending}
        onClick={() => {
          if (window.confirm('Cancelar este treino? As séries registradas serão perdidas.')) cancel.mutate();
        }}
        className="press min-h-11 w-full cursor-pointer rounded-2xl border border-status-broken/30 text-sm font-medium text-status-broken transition hover:bg-status-broken/10 disabled:opacity-50"
      >
        {cancel.isPending ? 'Cancelando…' : 'Cancelar treino'}
      </button>
    </div>
  );
}

function FinishMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
