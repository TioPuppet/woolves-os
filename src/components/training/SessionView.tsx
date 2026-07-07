'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PlanExercise, SetLog, LastPerf } from '@/lib/training';
import { CURATED_TECHNIQUES } from '@/lib/techniques';
import { muscleAssetKey, muscleLabel } from '@/lib/muscles';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

const REST_DEFAULT = 90;

interface CustomTechnique {
  id: number;
  name: string;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function feedback() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(180);
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.start();
    setTimeout(() => {
      o.stop();
      void ctx.close();
    }, 180);
  } catch {
    /* audio blocked — vibration still fires */
  }
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
  onRest,
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
    setType: string;
  }) => void;
  onDeleteSet: (id: number) => void;
  onAddTechnique: (name: string) => void;
  onDeleteTechnique: (id: number) => void;
  onRest: (seconds: number) => void;
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
  const [setType, setSetType] = useState<'work' | 'warmup'>('work');
  const [technique, setTechnique] = useState<string | null>(planExercise.technique ?? null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  const perfText = lastPerf.data ? summarizePerf(lastPerf.data) : null;
  const prevBest = useMemo(
    () => Math.max(0, ...(lastPerf.data ?? []).map((r) => r.load_kg ?? 0)),
    [lastPerf.data],
  );

  // Prefill reps/load from last time's top set (progressive overload).
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
  const workDone = sets.filter((s) => s.set_type === 'work').length;
  const target = planExercise.target_sets;

  const customNames = useMemo(() => new Set(techniques.map((t) => t.name)), [techniques]);

  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset
          assetKey={muscleAssetKey(planExercise.muscle_group ?? planExercise.exercise.muscle_group)}
          size={30}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {planExercise.exercise.name}
        </span>
        <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {workDone}
          {target ? `/${target}` : ''} séries
        </span>
      </div>

      {planExercise.target_sets ||
      planExercise.target_reps ||
      planExercise.rest_seconds ||
      planExercise.technique ? (
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
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {perfText ? `Última vez: ${perfText}` : 'Primeira vez neste exercício.'}
      </p>

      {sets.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {sets.map((s) => {
            const isPR = s.set_type === 'work' && s.load_kg != null && prevBest > 0 && s.load_kg > prevBest;
            return (
              <div key={s.id} className="flex items-center gap-2 text-sm tabular-nums">
                <span className="w-5 shrink-0 text-xs text-muted-foreground">{s.set_no}ª</span>
                {s.set_type === 'warmup' ? (
                  <span className="shrink-0 rounded bg-streak/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-streak">
                    Aquec
                  </span>
                ) : null}
                <span className="shrink-0">
                  {s.reps ?? '—'}
                  <span className="text-xs text-muted-foreground"> reps</span>
                </span>
                <span className="shrink-0">
                  {s.load_kg ?? '—'}
                  <span className="text-xs text-muted-foreground"> kg</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">RPE {s.rpe ?? '—'}</span>
                {isPR ? (
                  <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                    PR
                  </span>
                ) : null}
                {s.technique ? (
                  <span className="min-w-0 truncate rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {s.technique}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDeleteSet(s.id)}
                  aria-label="Remover série"
                  className="ml-auto shrink-0 text-muted-foreground hover:text-status-broken"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Technique chips */}
      <div className="flex flex-wrap gap-1.5">
        {CURATED_TECHNIQUES.map((t) => (
          <TechChip key={t} label={t} active={technique === t} onClick={() => setTechnique(technique === t ? null : t)} />
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

      {/* Warm-up vs work set */}
      <div className="flex gap-1.5">
        {(['work', 'warmup'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSetType(t)}
            className={cn(
              'press rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
              setType === t
                ? t === 'warmup'
                  ? 'border-streak/50 bg-streak/15 text-streak'
                  : 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted-foreground',
            )}
          >
            {t === 'work' ? 'Trabalho' : 'Aquecimento'}
          </button>
        ))}
      </div>

      {/* Set inputs */}
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
            });
            if (loadNum != null && prevBest > 0 && loadNum > prevBest) feedback();
            setRpe(''); // keep reps/load as prefill for the next set
            onRest(planExercise.rest_seconds ?? REST_DEFAULT);
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
        active ? 'border-primary/50 bg-primary/15 text-primary' : 'border-border text-muted-foreground',
      )}
    >
      <button type="button" onClick={onClick} className="cursor-pointer">
        {label}
      </button>
      {onDelete ? (
        <button type="button" onClick={onDelete} aria-label={`Excluir ${label}`} className="text-muted-foreground hover:text-status-broken">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

function RestBar({
  left,
  total,
  onAdjust,
  onSkip,
}: {
  left: number;
  total: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-40 mx-auto w-full max-w-app px-5">
      <div className="glass flex items-center gap-3 rounded-2xl border border-primary/30 p-3 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]">
        <span className="text-sm font-semibold text-primary">Descanso</span>
        <span className="text-lg font-bold tabular-nums">{fmt(left)}</span>
        <div className="mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-card">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <button type="button" onClick={() => onAdjust(-15)} className="press rounded-lg bg-card px-2 py-1 text-xs font-semibold">−15</button>
        <button type="button" onClick={() => onAdjust(15)} className="press rounded-lg bg-card px-2 py-1 text-xs font-semibold">+15</button>
        <button type="button" onClick={onSkip} className="press rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Pular</button>
      </div>
    </div>
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
  onComplete: () => void;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const sessionSets = useQuery({
    queryKey: ['session-sets', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('set_logs')
        .select('id, exercise_id, set_no, reps, load_kg, rpe, technique, set_type')
        .eq('session_id', sessionId)
        .order('set_no');
      return (data ?? []) as SetLog[];
    },
  });

  const sessionMeta = useQuery({
    queryKey: ['session-meta', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workout_sessions')
        .select('created_at')
        .eq('id', sessionId)
        .maybeSingle();
      return (data as { created_at: string } | null) ?? null;
    },
  });

  const techniques = useQuery({
    queryKey: ['techniques'],
    queryFn: async () => {
      const { data } = await supabase.from('techniques').select('id, name').order('name');
      return (data ?? []) as CustomTechnique[];
    },
  });

  // ---- Live clock (elapsed + rest countdown share one ticker) ----
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(REST_DEFAULT);
  const restLeft = restEnd != null ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : null;

  useEffect(() => {
    if (restEnd != null && restLeft === 0) {
      feedback();
      setRestEnd(null);
    }
  }, [restLeft, restEnd]);

  const startRest = (sec: number) => {
    setRestTotal(sec);
    setRestEnd(Date.now() + sec * 1000);
  };

  const logSet = useMutation({
    mutationFn: async (v: {
      exerciseId: number;
      setNo: number;
      reps: number | null;
      loadKg: number | null;
      rpe: number | null;
      technique: string | null;
      setType: string;
    }) => {
      const { error } = await supabase.from('set_logs').insert({
        session_id: sessionId,
        exercise_id: v.exerciseId,
        set_no: v.setNo,
        reps: v.reps,
        load_kg: v.loadKg,
        rpe: v.rpe,
        technique: v.technique,
        set_type: v.setType,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-sets', sessionId] }),
  });

  const deleteSet = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('set_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-sets', sessionId] }),
  });

  const addTechnique = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('techniques').insert({ user_id: userId, name });
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
      const { error } = await supabase.rpc('complete_session', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: () => {
      // Zera tudo: descanso, cache desta sessão e performance para um começo limpo.
      setRestEnd(null);
      qc.removeQueries({ queryKey: ['session-sets', sessionId] });
      qc.removeQueries({ queryKey: ['session-meta', sessionId] });
      qc.invalidateQueries({ queryKey: ['last-perf'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      onComplete();
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      setRestEnd(null);
      qc.removeQueries({ queryKey: ['session-sets', sessionId] });
      onCancel();
    },
  });

  const allSets = sessionSets.data ?? [];
  const custom = techniques.data ?? [];

  // Live session stats.
  const workSets = allSets.filter((s) => s.set_type === 'work');
  const totalVolume = workSets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.load_kg ?? 0), 0);
  const startedAt = sessionMeta.data?.created_at ? new Date(sessionMeta.data.created_at).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : null;

  // Group exercises by muscle group, preserving plan order.
  const groups: { key: string; items: PlanExercise[] }[] = [];
  for (const pe of exercises) {
    const g = pe.muscle_group ?? pe.exercise.muscle_group ?? 'outros';
    const found = groups.find((x) => x.key === g);
    if (found) found.items.push(pe);
    else groups.push({ key: g, items: [pe] });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Resumo ao vivo */}
      <div className="surface-1 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
        <div>
          <div className="text-lg font-bold tabular-nums">{elapsed != null ? fmt(elapsed) : '—'}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tempo</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">{workSets.length}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Séries</div>
        </div>
        <div>
          <div className="text-lg font-bold tabular-nums">{Math.round(totalVolume).toLocaleString('pt-BR')}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Volume kg</div>
        </div>
      </div>

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
              onRest={startRest}
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

      <button
        type="button"
        disabled={cancel.isPending}
        onClick={() => {
          if (window.confirm('Cancelar este treino? As séries registradas serão perdidas.')) {
            cancel.mutate();
          }
        }}
        className="press min-h-11 w-full cursor-pointer rounded-2xl border border-status-broken/30 text-sm font-medium text-status-broken transition hover:bg-status-broken/10 disabled:opacity-50"
      >
        {cancel.isPending ? 'Cancelando…' : 'Cancelar treino'}
      </button>

      {restLeft != null ? (
        <RestBar
          left={restLeft}
          total={restTotal}
          onAdjust={(d) => setRestEnd((e) => (e != null ? e + d * 1000 : e))}
          onSkip={() => setRestEnd(null)}
        />
      ) : null}
    </div>
  );
}
