'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTraining } from '@/hooks/useTraining';
import type { Plan, ActiveSession } from '@/lib/training';
import { MUSCLE_GROUPS, muscleAssetKey } from '@/lib/muscles';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { SessionView } from './SessionView';

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
    name: string,
    muscleGroup: string,
    orderIdx: number,
  ) => void;
  onDeleteExercise: (id: number) => void;
  onTrain: (plan: Plan) => void;
  onDelete: (planId: number) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<string>('peito');
  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
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

      {plan.plan_exercises.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {plan.plan_exercises.map((pe) => (
            <li
              key={pe.id}
              className="flex items-center justify-between gap-2 text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <ThiingsAsset
                  assetKey={muscleAssetKey(pe.exercise.muscle_group)}
                  size={20}
                />
                {pe.exercise.name}
              </span>
              <button
                type="button"
                onClick={() => onDeleteExercise(pe.id)}
                aria-label={`Remover ${pe.exercise.name}`}
                className="text-muted-foreground hover:text-status-broken"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Sem exercícios ainda.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adicionar exercício"
          className="min-h-10 min-w-[8rem] flex-1 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          aria-label="Grupo muscular"
          className="min-h-10 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
        >
          {MUSCLE_GROUPS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => {
            onAddExercise(plan.id, name, muscle, plan.plan_exercises.length);
            setName('');
          }}
          className="press min-h-10 cursor-pointer rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>

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

  const busy =
    createExercise.isPending ||
    createPlan.isPending ||
    addExerciseToPlan.isPending ||
    startSession.isPending;

  const addExerciseByName = async (
    planId: number,
    name: string,
    muscleGroup: string,
    orderIdx: number,
  ) => {
    const clean = name.trim();
    if (!clean) return;
    const existing = exercises.find(
      (e) => e.name.toLowerCase() === clean.toLowerCase(),
    );
    const ex =
      existing ??
      (await createExercise.mutateAsync({ name: clean, muscleGroup }));
    await addExerciseToPlan.mutateAsync({ planId, exerciseId: ex.id, orderIdx });
  };

  const activePlan = active
    ? plans.find((p) => p.id === active.planId) ?? null
    : null;

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 pb-28 pt-10">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="press text-muted-foreground hover:text-foreground"
          aria-label="Voltar"
        >
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
          <section className="surface-2 flex gap-2 rounded-2xl p-4">
            <input
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              placeholder="Nome do novo plano (ex.: Peito e Tríceps)"
              className="min-h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <button
              type="button"
              disabled={busy || !newPlan.trim()}
              onClick={async () => {
                await createPlan.mutateAsync(newPlan);
                setNewPlan('');
              }}
              className="press min-h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Criar
            </button>
          </section>

          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro plano para começar a treinar.
            </p>
          ) : (
            plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                busy={busy}
                onAddExercise={addExerciseByName}
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
