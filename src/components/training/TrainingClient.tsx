'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTraining } from '@/hooks/useTraining';
import {
  fetchActiveSession,
  type Plan,
  type PlanExercise,
  type ActiveSession,
  isCardioGroup,
} from '@/lib/training';
import { MUSCLE_GROUPS, muscleAssetKey, muscleLabel } from '@/lib/muscles';
import { CURATED_TECHNIQUES } from '@/lib/techniques';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import type { ThiingsAssetKey } from '@/lib/thiings-registry';
import { cn } from '@/lib/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { localDayString } from '@/lib/date';
import { SessionView } from './SessionView';
import type { WorkoutSummary } from './SessionView';
import { ExerciseHistorySheet } from './ExerciseHistorySheet';
import {
  activityMetricLabels,
  describeActivityMetrics,
  getTrainingModality,
} from '@/lib/training-modalities';

const inputCls =
  'min-h-10 w-full rounded-lg border border-border bg-card px-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60';

const TRAINING_PRESETS: { name: string; groups: string[]; intent: string }[] = [
  { name: 'PUSH', groups: ['peito', 'triceps', 'ombro'], intent: 'Pressão frontal' },
  { name: 'PULL', groups: ['costas', 'biceps'], intent: 'Controle e tração' },
  {
    name: 'LEGS',
    groups: ['perna-quadriceps', 'perna-posterior', 'gluteo', 'panturrilha'],
    intent: 'Base de guerra',
  },
  { name: 'UPPER', groups: ['peito', 'costas', 'ombro', 'biceps', 'triceps'], intent: 'Tronco dominante' },
  {
    name: 'LOWER',
    groups: ['perna-quadriceps', 'perna-posterior', 'gluteo', 'panturrilha'],
    intent: 'Pernas e território',
  },
  {
    name: 'FULL BODY',
    groups: ['peito', 'costas', 'perna-quadriceps', 'ombro', 'abdomen'],
    intent: 'Corpo inteiro',
  },
  { name: 'CARDIO', groups: ['cardio'], intent: 'Fôlego e caça' },
];

const CARDIO_PRESETS: { name: string; icon: ThiingsAssetKey }[] = [
  { name: 'Caminhada', icon: 'cardio-caminhada' },
  { name: 'Caminhada rápida', icon: 'cardio-caminhada-rapida' },
  { name: 'Caminhada inclinada', icon: 'cardio-caminhada-inclinada' },
  { name: 'Trilha/Hiking', icon: 'cardio-trilha-hiking' },
  { name: 'Corrida', icon: 'cardio-corrida' },
  { name: 'Corrida intervalada', icon: 'cardio-corrida-intervalada' },
  { name: 'Esteira', icon: 'cardio-esteira' },
  { name: 'Ciclismo', icon: 'cardio-ciclismo' },
  { name: 'Bike indoor', icon: 'cardio-bike-indoor' },
  { name: 'Spinning', icon: 'cardio-bike-indoor' },
  { name: 'Natação', icon: 'cardio-natacao' },
  { name: 'Remo', icon: 'cardio-remo' },
  { name: 'Elíptico', icon: 'cardio-eliptico' },
  { name: 'Escada/Stepper', icon: 'cardio-escada-stepper' },
  { name: 'HIIT', icon: 'cardio-hiit' },
  { name: 'Funcional', icon: 'cardio-funcional' },
  { name: 'Pular corda', icon: 'cardio-pular-corda' },
  { name: 'Dança', icon: 'cardio-danca' },
  { name: 'Yoga', icon: 'cardio-yoga' },
  { name: 'Pilates', icon: 'cardio-pilates' },
  { name: 'Mobilidade', icon: 'cardio-mobilidade' },
  { name: 'Alongamento', icon: 'cardio-alongamento' },
  { name: 'Boxe', icon: 'cardio-boxe' },
  { name: 'Kickboxing', icon: 'cardio-kickboxing' },
  { name: 'Muay Thai', icon: 'cardio-muay-thai' },
  { name: 'Jiu-jitsu', icon: 'cardio-jiu-jitsu' },
  { name: 'Judô', icon: 'cardio-judo' },
  { name: 'MMA', icon: 'cardio-mma' },
  { name: 'Karatê Shotokan', icon: 'cardio-karate-shotokan' },
  { name: 'Futebol', icon: 'cardio-futebol' },
  { name: 'Basquete', icon: 'cardio-basquete' },
  { name: 'Tênis', icon: 'cardio-tenis' },
  { name: 'Vôlei', icon: 'cardio-voley' },
  { name: 'Skate', icon: 'cardio-skate' },
  { name: 'Patins', icon: 'cardio-patins' },
];

function groupOf(pe: PlanExercise): string {
  const group = pe.muscle_group ?? pe.exercise.muscle_group;
  if (isCardioGroup(group)) return 'cardio';
  return group ?? 'outros';
}

function planGroups(plan: Plan): string[] {
  const present = Array.from(new Set(plan.plan_exercises.map(groupOf)));
  return plan.muscle_groups.length
    ? Array.from(new Set([...plan.muscle_groups, ...present]))
    : present;
}

function planPrescription(plan: Plan): string {
  const exercises = plan.plan_exercises.length;
  const sets = plan.plan_exercises.reduce(
    (sum, pe) => sum + (pe.target_sets ?? 0),
    0,
  );
  const parts = [
    `${exercises} exercício${exercises === 1 ? '' : 's'}`,
    sets > 0 ? `${sets} séries` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

function primaryPlanGroup(plan: Plan): string | null {
  return planGroups(plan)[0] ?? null;
}

/** A planned exercise with editable prescription (sets/reps/rest/technique). */
function PlanExerciseRow({
  pe,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
  onHistory,
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
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
  onHistory: () => void;
}) {
  const [sets, setSets] = useState(pe.target_sets?.toString() ?? '');
  const [reps, setReps] = useState(pe.target_reps ?? '');
  const [rest, setRest] = useState(pe.rest_seconds?.toString() ?? '');
  const [tech, setTech] = useState(pe.technique ?? '');
  const cardio = isCardioGroup(groupOf(pe));
  const modality = cardio ? getTrainingModality(pe.exercise.name) : null;

  return (
    <div className="surface-1 rise flex flex-col gap-3 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <ThiingsAsset assetKey={modality?.icon ?? muscleAssetKey(groupOf(pe))} size={34} />
          <span className="truncate text-sm font-semibold">
            {pe.exercise.name}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canUp}
            aria-label="Mover para cima"
            className="press transition-colors hover:text-foreground disabled:opacity-25"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canDown}
            aria-label="Mover para baixo"
            className="press transition-colors hover:text-foreground disabled:opacity-25"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onHistory}
            aria-label="Ver progresso"
            className="press transition-colors hover:text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(pe.id)}
            aria-label={`Remover ${pe.exercise.name}`}
            className="press transition-colors hover:text-status-broken"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      </div>

      {cardio ? (
        <div className="rounded-xl border border-[hsl(211_90%_58%)]/20 bg-[hsl(211_90%_58%)]/[0.06] px-3 py-2.5">
          <p className="text-xs font-semibold text-[hsl(211_90%_68%)]">Registro de {modality?.label}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ao iniciar, registre {modality ? describeActivityMetrics(modality) : 'as métricas'}.
          </p>
          {modality ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modality.metrics.map((metric) => (
                <span
                  key={metric}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                >
                  {activityMetricLabels[metric]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
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
        </>
      )}
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
  onReorder,
  onHistory,
  busy,
}: {
  groupKey: string;
  exercises: PlanExercise[];
  canAdd: boolean;
  onAdd: (name: string) => void;
  onUpdate: PlanExerciseRowUpdate;
  onDeleteExercise: (id: number) => void;
  onReorder: (a: PlanExercise, b: PlanExercise) => void;
  onHistory: (pe: PlanExercise) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const label = muscleLabel(groupKey);
  const cardio = isCardioGroup(groupKey);
  const exerciseNames = new Set(exercises.map((pe) => pe.exercise.name));
  const availableCardio = CARDIO_PRESETS.filter(
    (preset) => !exerciseNames.has(preset.name),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset assetKey={muscleAssetKey(groupKey)} size={34} />
        <h4 className="text-base font-semibold">{label}</h4>
      </div>

      {exercises.map((pe, i) => {
        const prev = exercises[i - 1];
        const next = exercises[i + 1];
        return (
          <PlanExerciseRow
            key={pe.id}
            pe={pe}
            onUpdate={onUpdate}
            onDelete={onDeleteExercise}
            canUp={!!prev}
            canDown={!!next}
            onMoveUp={() => prev && onReorder(pe, prev)}
            onMoveDown={() => next && onReorder(pe, next)}
            onHistory={() => onHistory(pe)}
          />
        );
      })}

      {canAdd ? (
        cardio ? (
          availableCardio.length > 0 ? (
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {availableCardio.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  disabled={busy}
                  onClick={() => onAdd(preset.name)}
                  className="press flex min-h-12 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 text-left text-xs font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <ThiingsAsset assetKey={preset.icon} size={28} />
                  <span className="min-w-0 truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          ) : null
        ) : (
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
        )
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
  onReorder,
  onHistory,
  onRename,
  onDuplicate,
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
  onReorder: (a: PlanExercise, b: PlanExercise) => void;
  onHistory: (pe: PlanExercise) => void;
  onRename: (id: number, name: string) => void;
  onDuplicate: (plan: Plan) => void;
  onTrain: (plan: Plan) => void;
  onDelete: (planId: number) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(plan.name);
  const groups = planGroups(plan);
  const leftover = plan.plan_exercises.filter((pe) => !groups.includes(groupOf(pe)));

  return (
    <div className="surface-2 rise flex flex-col gap-6 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title.trim() !== plan.name) onRename(plan.id, title);
            else setTitle(plan.name);
          }}
          aria-label="Nome do treino"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-lg font-semibold focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={() => onDuplicate(plan)}
          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          Duplicar
        </button>
        <button
          type="button"
          onClick={() => onDelete(plan.id)}
          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-status-broken"
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
          onReorder={onReorder}
          onHistory={onHistory}
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
          onReorder={onReorder}
          onHistory={onHistory}
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

function TrainingCommand({
  plans,
  featured,
  busy,
  onTrain,
}: {
  plans: Plan[];
  featured: Plan | null;
  busy: boolean;
  onTrain: (plan: Plan) => void;
}) {
  const totalExercises = plans.reduce((sum, plan) => sum + plan.plan_exercises.length, 0);
  const primaryGroup = featured ? primaryPlanGroup(featured) : null;
  const hasTrainingReady = totalExercises > 0;

  return (
    <section className="training-command rounded-[2rem] border border-white/[0.08] p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] ring-1 ring-primary/20">
          <ThiingsAsset
            assetKey={primaryGroup ? muscleAssetKey(primaryGroup) : 'calories'}
            size={50}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Arena de treino
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">
            {hasTrainingReady && featured ? featured.name : 'Forje sua arena'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {hasTrainingReady && featured
              ? planPrescription(featured)
              : 'Escolha a batalha, organize o corpo e avance com estratégia.'}
          </p>
        </div>
      </div>

      {hasTrainingReady && featured ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {planGroups(featured).slice(0, 5).map((group) => (
              <span
                key={group}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                <ThiingsAsset assetKey={muscleAssetKey(group)} size={18} />
                {muscleLabel(group)}
              </span>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || featured.plan_exercises.length === 0}
            onClick={() => onTrain(featured)}
            className="press mt-5 min-h-12 w-full cursor-pointer rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Iniciar treino
          </button>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-3">
          <p className="text-xs font-semibold uppercase text-primary">
            Estratégia antes da força
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            O lobo não desperdiça energia. Define o alvo, escolhe o ritual e executa.
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <TrainingMetric label="Treinos" value={String(plans.length)} />
        <TrainingMetric label="Exercícios" value={String(totalExercises)} />
      </div>
    </section>
  );
}

function TrainingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function CompletionScreen({
  name,
  planName,
  summary,
  onTrainAgain,
}: {
  name: string;
  planName: string;
  summary: WorkoutSummary;
  onTrainAgain: () => void;
}) {
  const verdict =
    summary.difficulty === 'Brutal'
      ? 'Foi brutal. O corpo pagou o preço, e a mente saiu mais difícil de quebrar.'
      : summary.difficulty === 'Leve'
        ? 'Foi leve. Nem toda vitória precisa sangrar; consistência também conquista território.'
        : 'Foi firme. Disciplina sem espetáculo, progresso sem desculpa.';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 px-8 pb-24 pt-6 text-center">
      <div className="flex flex-col items-center gap-5">
        <ThiingsAsset assetKey="award" size={104} className="anim-pop" />
        <div className="flex flex-col gap-2.5">
          <h1
            className="anim-rise text-balance text-2xl font-bold uppercase leading-tight tracking-tight"
            style={{ animationDelay: '120ms' }}
          >
            Excelente trabalho,{' '}
            <span className="whitespace-nowrap">{name}</span>
          </h1>
          <p
            className="anim-rise text-balance leading-relaxed text-muted-foreground"
            style={{ animationDelay: '240ms' }}
          >
            {planName} concluído. A alcateia respeita quem termina o que começa.
          </p>
          <p
            className="anim-rise text-balance leading-relaxed text-muted-foreground"
            style={{ animationDelay: '340ms' }}
          >
            {verdict}
          </p>
        </div>
        <span
          className="anim-pop rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-primary"
          style={{ animationDelay: '480ms' }}
        >
          +{summary.exp} EXP conquistado
        </span>
      </div>

      <div
        className="anim-rise grid w-full max-w-sm grid-cols-2 gap-2"
        style={{ animationDelay: '560ms' }}
      >
        <CompletionMetric label="Tempo" value={formatDuration(summary.durationSec)} />
        <CompletionMetric label="Séries" value={String(summary.sets)} />
        <CompletionMetric label="Dificuldade" value={summary.difficulty} />
        <CompletionMetric label="EXP" value={`+${summary.exp}`} />
      </div>

      <div
        className="anim-rise flex w-full max-w-xs flex-col gap-3"
        style={{ animationDelay: '700ms' }}
      >
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

function formatDuration(sec: number): string {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function CompletionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
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
    renamePlan,
    swapExercises,
    duplicatePlan,
    startSession,
  } = useTraining(userId, timezone);

  const [active, setActive] = useState<{ id: number; planId: number | null } | null>(
    initialSession ? { id: initialSession.id, planId: initialSession.plan_id } : null,
  );
  const [newPlan, setNewPlan] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [builderOpen, setBuilderOpen] = useState(plans.length === 0);
  const [cardioOpen, setCardioOpen] = useState(false);
  const [customPlanOpen, setCustomPlanOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<{
    planName: string;
    summary: WorkoutSummary;
  } | null>(null);
  const [historyFor, setHistoryFor] = useState<{ id: number; name: string } | null>(null);
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const activeSessionKey = ['active-session', userId, timezone] as const;

  const activeSession = useQuery({
    queryKey: activeSessionKey,
    queryFn: () => fetchActiveSession(supabase, localDayString(timezone)),
    initialData: initialSession,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Fully reset to a clean slate for a brand-new workout.
  const resetToFresh = () => {
    setActive(null);
    setCelebrate(null);
    qc.removeQueries({ queryKey: ['session-sets'] });
    qc.invalidateQueries({ queryKey: ['plans'] });
    qc.invalidateQueries({ queryKey: ['last-perf'] });
  };

  const busy =
    createExercise.isPending ||
    createPlan.isPending ||
    addExerciseToPlan.isPending ||
    startSession.isPending;

  const toggleGroup = (key: string) =>
    setSelectedGroups((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  useEffect(() => {
    if (plans.length === 0) setBuilderOpen(true);
  }, [plans.length]);

  useEffect(() => {
    if (celebrate) return;
    const session = activeSession.data;
    setActive(session ? { id: session.id, planId: session.plan_id } : null);
  }, [activeSession.data, celebrate]);

  const createTrainingPlan = async (
    name: string,
    groups: string[],
    starterExercise?: string,
  ) => {
    const clean = name.trim();
    if (!clean || groups.length === 0) return;
    const plan = await createPlan.mutateAsync({
      name: clean,
      muscleGroups: groups,
    });
    if (starterExercise) {
      await addExercise(plan.id, 'cardio', starterExercise, 0);
    }
    setNewPlan('');
    setSelectedGroups([]);
    setCardioOpen(false);
    setCustomPlanOpen(false);
    setBuilderOpen(false);
  };

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
  const featuredPlan =
    plans.find((plan) => plan.plan_exercises.length > 0) ?? plans[0] ?? null;

  const startPlan = async (plan: Plan) => {
    const id = await startSession.mutateAsync(plan.id);
    qc.setQueryData<ActiveSession>(activeSessionKey, {
      id,
      plan_id: plan.id,
      ref_date: localDayString(timezone),
    });
    setActive({ id, planId: plan.id });
  };

  if (celebrate) {
    return (
      <CompletionScreen
        name={name}
        planName={celebrate.planName}
        summary={celebrate.summary}
        onTrainAgain={resetToFresh}
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
            onComplete={(summary) => {
              qc.setQueryData(activeSessionKey, null);
              setCelebrate({ planName: activePlan.name, summary });
              setActive(null);
            }}
            onCancel={() => setActive(null)}
          />
        </>
      ) : (
        <>
          <TrainingCommand
            plans={plans}
            featured={featuredPlan}
            busy={busy}
            onTrain={startPlan}
          />

          {builderOpen ? (
            <section className="surface-2 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Mapa da arena
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Escolha seu ritual de treino
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    O plano vence antes do peso subir. Defina a rota e execute.
                  </p>
                </div>
                {plans.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setBuilderOpen(false)}
                    aria-label="Fechar criação de treino"
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-muted-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {TRAINING_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      preset.name === 'CARDIO'
                        ? setCardioOpen((v) => !v)
                        : createTrainingPlan(preset.name, preset.groups)
                    }
                    className={cn(
                      'press flex min-h-16 items-center gap-3 rounded-2xl border px-3 text-left transition hover:bg-white/[0.06] disabled:opacity-50',
                      preset.name === 'CARDIO' && cardioOpen
                        ? 'border-primary/35 bg-primary/10'
                        : 'border-white/[0.08] bg-white/[0.03]',
                    )}
                  >
                    <ThiingsAsset
                      assetKey={muscleAssetKey(preset.groups[0])}
                      size={30}
                    />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {preset.name}
                        </span>
                        <span className="block truncate text-[10px] font-semibold text-primary">
                          {preset.intent}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {preset.groups.map(muscleLabel).join(' · ')}
                        </span>
                      </span>
                    {preset.name === 'CARDIO' ? (
                      <span className="ml-auto shrink-0 text-primary">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                          className={cn(
                            'transition-transform',
                            cardioOpen ? 'rotate-180' : '',
                          )}
                        >
                          <path
                            d="M6 9l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {cardioOpen ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Fôlego, combate e território
                  </p>
                  <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {CARDIO_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        disabled={busy}
                        onClick={() => createTrainingPlan(preset.name, ['cardio'], preset.name)}
                        className="press flex min-h-12 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 text-left text-xs font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        <ThiingsAsset assetKey={preset.icon} size={26} />
                        <span className="min-w-0 truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setCustomPlanOpen((v) => !v)}
                className="press mt-3 min-h-11 w-full rounded-2xl border border-dashed border-white/[0.14] text-sm font-semibold text-muted-foreground"
              >
                Criar rota própria
              </button>

              {customPlanOpen ? (
                <div className="mt-4 flex flex-col gap-3">
                  <input
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    placeholder="Nome da rota"
                    className={cn(inputCls, 'min-h-11')}
                  />
                  <p className="text-xs font-medium text-muted-foreground">
                    Territórios trabalhados
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
                    onClick={() => createTrainingPlan(newPlan, selectedGroups)}
                    className="press min-h-11 w-full cursor-pointer rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Forjar treino
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma rota forjada ainda. Escolha um ritual acima para abrir a arena.
            </p>
          ) : (
            <section className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Biblioteca
                </p>
                <h2 className="mt-1 text-xl font-semibold">Seus treinos</h2>
              </div>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  busy={busy}
                  onAddExercise={addExercise}
                  onUpdate={(id, patch) => updatePlanExercise.mutate({ id, patch })}
                  onDeleteExercise={(id) => deletePlanExercise.mutate(id)}
                  onReorder={(a, b) =>
                    swapExercises.mutate({
                      aId: a.id,
                      aOrder: a.order_idx,
                      bId: b.id,
                      bOrder: b.order_idx,
                    })
                  }
                  onHistory={(pe) => setHistoryFor({ id: pe.exercise_id, name: pe.exercise.name })}
                  onRename={(id, planName) => renamePlan.mutate({ id, name: planName })}
                  onDuplicate={(p) => duplicatePlan.mutate(p)}
                  onDelete={(id) => deletePlan.mutate(id)}
                  onTrain={startPlan}
                />
              ))}
            </section>
          )}

          {historyFor ? (
            <ExerciseHistorySheet
              open
              userId={userId}
              exerciseId={historyFor.id}
              exerciseName={historyFor.name}
              onClose={() => setHistoryFor(null)}
            />
          ) : null}
        </>
      )}
    </main>
  );
}
