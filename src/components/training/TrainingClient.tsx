'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTraining } from '@/hooks/useTraining';
import type { Plan, PlanExercise, ActiveSession } from '@/lib/training';
import { MUSCLE_GROUPS, muscleAssetKey } from '@/lib/muscles';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { SessionView } from './SessionView';

function labelFor(key: string): string {
  return MUSCLE_GROUPS.find((m) => m.key === key)?.label ?? key;
}

/** One muscle-group section inside a plan: icon title + its exercises + add. */
function GroupSection({
  groupKey,
  exercises,
  canAdd,
  onAdd,
  onDeleteExercise,
  busy,
}: {
  groupKey: string;
  exercises: PlanExercise[];
  canAdd: boolean;
  onAdd: (name: string) => void;
  onDeleteExercise: (id: number) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const label = labelFor(groupKey);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <ThiingsAsset assetKey={muscleAssetKey(groupKey)} size={24} />
        <h4 className="text-sm font-semibold">{label}</h4>
      </div>

      {exercises.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {exercises.map((pe) => (
            <li
              key={pe.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-3 py-2 text-sm"
            >
              <span>{pe.exercise.name}</span>
              <button
                type="button"
                onClick={() => onDeleteExercise(pe.id)}
                aria-label={`Remover ${pe.exercise.name}`}
                className="text-muted-foreground hover:text-status-broken"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {canAdd ? (
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Exercício de ${label.toLowerCase()}`}
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => {
              onAdd(name);
              setName('');
            }}
            className="press min-h-10 shrink-0 cursor-pointer rounded-lg border border-border px-4 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  onAddExercise,
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
  onDeleteExercise: (id: number) => void;
  onTrain: (plan: Plan) => void;
  onDelete: (planId: number) => void;
  busy: boolean;
}) {
  const groups = plan.muscle_groups.length
    ? plan.muscle_groups
    : Array.from(
        new Set(
          plan.plan_exercises
            .map((pe) => pe.exercise.muscle_group)
            .filter((g): g is string => !!g),
        ),
      );

  // Exercises not covered by any listed group (e.g. legacy null) → "Outros".
  const leftover = plan.plan_exercises.filter(
    (pe) => !pe.exercise.muscle_group || !groups.includes(pe.exercise.muscle_group),
  );

  return (
    <div className="surface-2 flex flex-col gap-5 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{plan.name}</h3>
        <button
          type="button"
          onClick={() => onDelete(plan.id)}
          className="text-xs text-muted-foreground hover:text-status-broken"
        >
          Excluir
        </button>
      </div>

      {groups.map((g) => (
        <GroupSection
          key={g}
          groupKey={g}
          canAdd
          exercises={plan.plan_exercises.filter(
            (pe) => pe.exercise.muscle_group === g,
          )}
          onAdd={(name) => onAddExercise(plan.id, g, name, plan.plan_exercises.length)}
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

export function TrainingClient({
  userId,
  timezone,
  initialSession,
}: {
  userId: string;
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
    deletePlanExercise,
    startSession,
  } = useTraining(userId, timezone);

  const [active, setActive] = useState<{ id: number; planId: number | null } | null>(
    initialSession ? { id: initialSession.id, planId: initialSession.plan_id } : null,
  );
  const [newPlan, setNewPlan] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

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
    await addExerciseToPlan.mutateAsync({ planId, exerciseId: ex.id, orderIdx });
  };

  const activePlan = active
    ? plans.find((p) => p.id === active.planId) ?? null
    : null;

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 pb-28 pt-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="press text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="calories" size={28} />
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
            onComplete={() => setActive(null)}
          />
        </>
      ) : (
        <>
          <section className="surface-2 flex flex-col gap-3 rounded-2xl p-5">
            <input
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              placeholder="Nome do treino (ex.: PUSH)"
              className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
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
                      'press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
                      on
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    <ThiingsAsset assetKey={muscleAssetKey(m.key)} size={16} />
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
