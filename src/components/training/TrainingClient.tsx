'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTraining } from '@/hooks/useTraining';
import type { Plan, PlanExercise, ActiveSession } from '@/lib/training';
import { MUSCLE_GROUPS, muscleAssetKey, muscleLabel } from '@/lib/muscles';
import { CURATED_TECHNIQUES } from '@/lib/techniques';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { SessionView } from './SessionView';

const inputCls =
  'min-h-10 w-full rounded-lg border border-border bg-card px-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60';

function groupOf(pe: PlanExercise): string {
  return pe.muscle_group ?? pe.exercise.muscle_group ?? 'outros';
}

/** A planned exercise with editable prescription (sets/reps/rest/technique). */
function PlanExerciseRow({
  pe,
  onUpdate,
  onDelete,
}: {
  pe: PlanExercise;
  onUpdate: (
    id: number,
    patch: {
      target_sets?: number | null;
      target_reps?: string | null;
      rest_seconds?: number | null;
      technique?: string | null;
    },
  ) => void;
  onDelete: (id: number) => void;
}) {
  const [sets, setSets] = useState(pe.target_sets?.toString() ?? '');
  const [reps, setReps] = useState(pe.target_reps ?? '');
  const [rest, setRest] = useState(pe.rest_seconds?.toString() ?? '');
  const [tech, setTech] = useState(pe.technique ?? '');

  return (
    <div className="surface-1 rise flex flex-col gap-3 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <ThiingsAsset assetKey={muscleAssetKey(groupOf(pe))} size={30} />
          <span className="truncate text-sm font-semibold">
            {pe.exercise.name}
          </span>
        </span>
        <button
          type="button"
          onClick={() => onDelete(pe.id)}
          aria-label={`Remover ${pe.exercise.name}`}
          className="shrink-0 text-muted-foreground transition-colors hover:text-status-broken"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input
          inputMode="numeric"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          onBlur={() =>
            onUpdate(pe.id, { target_sets: sets === '' ? null : Number(sets) })
          }
          placeholder="Séries"
          className={inputCls}
        />
        <input
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={() => onUpdate(pe.id, { target_reps: reps || null })}
          placeholder="Reps"
          className={inputCls}
        />
        <input
          inputMode="numeric"
          value={rest}
          onChange={(e) => setRest(e.target.value)}
          onBlur={() =>
            onUpdate(pe.id, {
              rest_seconds: rest === '' ? null : Number(rest),
            })
          }
          placeholder="Desc. (s)"
          className={inputCls}
        />
      </div>

      <select
        value={tech}
        onChange={(e) => {
          setTech(e.target.value);
          onUpdate(pe.id, { technique: e.target.value || null });
        }}
        className={cn(inputCls, 'text-foreground')}
      >
        <option value="">Técnica (opcional)</option>
        {CURATED_TECHNIQUES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}

function GroupSection({
  groupKey,
  exercises,
  canAdd,
  onAdd,
  onUpdate,
  onDeleteExercise,
  busy,
}: {
  groupKey: string;
  exercises: PlanExercise[];
  canAdd: boolean;
  onAdd: (name: string) => void;
  onUpdate: PlanExerciseRowUpdate;
  onDeleteExercise: (id: number) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const label = muscleLabel(groupKey);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset assetKey={muscleAssetKey(groupKey)} size={34} />
        <h4 className="text-base font-semibold">{label}</h4>
      </div>

      {exercises.map((pe) => (
        <PlanExerciseRow
          key={pe.id}
          pe={pe}
          onUpdate={onUpdate}
          onDelete={onDeleteExercise}
        />
      ))}

      {canAdd ? (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Exercício de ${label.toLowerCase()}`}
            className={cn(inputCls, 'min-w-0 flex-1')}
          />
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => {
              onAdd(name);
              setName('');
            }}
            aria-label="Adicionar exercício"
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

type PlanExerciseRowUpdate = (
  id: number,
  patch: {
    target_sets?: number | null;
    target_reps?: string | null;
    rest_seconds?: number | null;
    technique?: string | null;
  },
) => void;

function PlanCard({
  plan,
  onAddExercise,
  onUpdate,
  onDeleteExercise,
  onTrain,
  onDelete,
  busy,
}: {
  plan: Plan;
  onAddExercise: (
    planId: number,
    groupKey: string,
    name: string,
    orderIdx: number,
  ) => void;
  onUpdate: PlanExerciseRowUpdate;
  onDeleteExercise: (id: number) => void;
  onTrain: (plan: Plan) => void;
  onDelete: (planId: number) => void;
  busy: boolean;
}) {
  const present = Array.from(new Set(plan.plan_exercises.map(groupOf)));
  const groups = plan.muscle_groups.length
    ? Array.from(new Set([...plan.muscle_groups, ...present.filter((g) => g !== 'outros')]))
    : present;
  const leftover = plan.plan_exercises.filter((pe) => !groups.includes(groupOf(pe)));

  return (
    <div className="surface-2 rise flex flex-col gap-6 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        <button
          type="button"
          onClick={() => onDelete(plan.id)}
          className="text-xs text-muted-foreground transition-colors hover:text-status-broken"
        >
          Excluir
        </button>
      </div>

      {groups.map((g) => (
        <GroupSection
          key={g}
          groupKey={g}
          canAdd
          exercises={plan.plan_exercises.filter((pe) => groupOf(pe) === g)}
          onAdd={(name) => onAddExercise(plan.id, g, name, plan.plan_exercises.length)}
          onUpdate={onUpdate}
          onDeleteExercise={onDeleteExercise}
          busy={busy}
        />
      ))}

      {leftover.length > 0 ? (
        <GroupSection
          groupKey="outros"
          canAdd={false}
          exercises={leftover}
          onAdd={() => {}}
          onUpdate={onUpdate}
          onDeleteExercise={onDeleteExercise}
          busy={busy}
        />
      ) : null}

      <button
        type="button"
        disabled={busy || plan.plan_exercises.length === 0}
        onClick={() => onTrain(plan)}
        className="press min-h-11 w-full cursor-pointer rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        Treinar
      </button>
    </div>
  );
}

function CompletionScreen({
  name,
  planName,
  onTrainAgain,
}: {
  name: string;
  planName: string;
  onTrainAgain: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-8 pb-28 text-center">
      <div className="rise flex flex-col items-center gap-6">
        <ThiingsAsset assetKey="award" size={128} />
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            Excelente trabalho, {name}
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {planName} concluído. A alcateia respeita quem termina o que começa.
          </p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Agora descanse, hoje foi progresso. Amanhã é Evolução.
          </p>
        </div>
        <span className="rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-primary">
          +50 EXP conquistado
        </span>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/"
          className="press flex min-h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Voltar ao início
        </Link>
        <button
          type="button"
          onClick={onTrainAgain}
          className="press min-h-12 cursor-pointer rounded-2xl border border-border text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          Realizar outro treino
        </button>
      </div>
    </main>
  );
}

export function TrainingClient({
  userId,
  name,
  timezone,
  initialSession,
}: {
  userId: string;
  name: string;
  timezone: string;
  initialSession: ActiveSession | null;
}) {
  const {
    plans,
    exercises,
    createExercise,
    createPlan,
    deletePlan,
    addExerciseToPlan,
    updatePlanExercise,
    deletePlanExercise,
    startSession,
  } = useTraining(userId, timezone);

  const [active, setActive] = useState<{ id: number; planId: number | null } | null>(
    initialSession ? { id: initialSession.id, planId: initialSession.plan_id } : null,
  );
  const [newPlan, setNewPlan] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  const busy =
    createExercise.isPending ||
    createPlan.isPending ||
    addExerciseToPlan.isPending ||
    startSession.isPending;

  const toggleGroup = (key: string) =>
    setSelectedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const addExercise = async (
    planId: number,
    groupKey: string,
    name: string,
    orderIdx: number,
  ) => {
    const clean = name.trim();
    if (!clean) return;
    const existing = exercises.find(
      (e) => e.name.toLowerCase() === clean.toLowerCase(),
    );
    const ex =
      existing ??
      (await createExercise.mutateAsync({ name: clean, muscleGroup: groupKey }));
    await addExerciseToPlan.mutateAsync({
      planId,
      exerciseId: ex.id,
      orderIdx,
      muscleGroup: groupKey,
    });
  };

  const activePlan = active
    ? plans.find((p) => p.id === active.planId) ?? null
    : null;

  if (celebrate) {
    return (
      <CompletionScreen
        name={name}
        planName={celebrate}
        onTrainAgain={() => setCelebrate(null)}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 pb-28 pt-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="press text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="calories" size={30} />
          <h1 className="text-xl font-semibold">Treino</h1>
        </div>
      </header>

      {active && activePlan ? (
        <>
          <p className="text-sm text-muted-foreground">
            Treino em andamento · {activePlan.name}
          </p>
          <SessionView
            sessionId={active.id}
            exercises={activePlan.plan_exercises}
            userId={userId}
            onComplete={() => {
              setCelebrate(activePlan.name);
              setActive(null);
            }}
            onCancel={() => setActive(null)}
          />
        </>
      ) : (
        <>
          <section className="surface-2 flex flex-col gap-3 rounded-2xl p-5">
            <input
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              placeholder="Nome do treino (ex.: PUSH)"
              className={cn(inputCls, 'min-h-11')}
            />
            <p className="text-xs font-medium text-muted-foreground">
              Grupos musculares deste treino
            </p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((m) => {
                const on = selectedGroups.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleGroup(m.key)}
                    className={cn(
                      'press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      on
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    <ThiingsAsset assetKey={muscleAssetKey(m.key)} size={18} />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={busy || !newPlan.trim() || selectedGroups.length === 0}
              onClick={async () => {
                await createPlan.mutateAsync({
                  name: newPlan,
                  muscleGroups: selectedGroups,
                });
                setNewPlan('');
                setSelectedGroups([]);
              }}
              className="press min-h-11 w-full cursor-pointer rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Criar treino
            </button>
          </section>

          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro treino escolhendo os grupos musculares.
            </p>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                busy={busy}
                onAddExercise={addExercise}
                onUpdate={(id, patch) => updatePlanExercise.mutate({ id, patch })}
                onDeleteExercise={(id) => deletePlanExercise.mutate(id)}
                onDelete={(id) => deletePlan.mutate(id)}
                onTrain={async (p) => {
                  const id = await startSession.mutateAsync(p.id);
                  setActive({ id, planId: p.id });
                }}
              />
            ))
          )}
        </>
      )}
    </main>
  );
}
