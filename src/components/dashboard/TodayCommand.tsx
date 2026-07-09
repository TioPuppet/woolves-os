'use client';

import type { CSSProperties } from 'react';
import { DAY_STATUS_META, type DayStatus } from '@/lib/day-status';

interface Ring {
  key: string;
  label: string;
  value: string;
  progress: number;
  color: string;
}

function percent(current: number, goal: number | null): number | null {
  if (!goal || goal <= 0) return null;
  return Math.min(100, Math.round((current / goal) * 100));
}

function clampRing(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function TodayCommand({
  status,
  missionText,
  missionDone,
  habit,
  habitDone,
  waterMl,
  waterGoalMl,
  proteinToday,
  proteinGoal,
}: {
  status: DayStatus;
  missionText: string | null;
  missionDone: boolean;
  habit: string | null;
  habitDone: boolean;
  waterMl: number;
  waterGoalMl: number | null;
  proteinToday: number;
  proteinGoal: number | null;
}) {
  const waterPct = percent(waterMl, waterGoalMl);
  const proteinPct = percent(proteinToday, proteinGoal);
  const missionProgress = missionText ? (missionDone ? 100 : 48) : 0;
  const habitProgress = habit ? (habitDone ? 100 : 18) : 0;
  const waterProgress = waterPct ?? (waterMl > 0 ? 25 : 0);

  const rings: Ring[] = [
    {
      key: 'mission',
      label: 'Missão',
      value: missionDone ? 'Feita' : missionText ? 'Aberta' : 'Definir',
      progress: missionProgress,
      color: '#ff453a',
    },
    {
      key: 'habit',
      label: 'Hábito',
      value: habitDone ? 'Feito' : habit ? 'Pendente' : 'Base',
      progress: habitProgress,
      color: '#32d74b',
    },
    {
      key: 'water',
      label: 'Água',
      value: waterGoalMl ? `${waterPct ?? 0}%` : `${waterMl}ml`,
      progress: waterProgress,
      color: '#0a84ff',
    },
  ];
  const proteinLabel = proteinGoal
    ? `${proteinPct ?? 0}% proteína`
    : `${proteinToday}g proteína`;

  return (
    <section className="fitness-card rise overflow-hidden rounded-[1.65rem] border border-white/[0.07] bg-[linear-gradient(145deg,hsl(240_5%_13%),hsl(240_7%_8%))] p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground/90">
            Círculos de atividade
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-tight">
            Resumo
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-primary">
            {DAY_STATUS_META[status].label}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {proteinLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-5 max-[370px]:grid-cols-1 max-[370px]:justify-items-center max-[370px]:gap-4">
        <div className="relative h-[7.25rem] w-[7.25rem]">
          {rings.map((ring, index) => (
            <ActivityRing
              key={ring.key}
              radius={48 - index * 14}
              width={11}
              ring={ring}
              delayMs={80 + index * 140}
            />
          ))}
          <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(240_7%_10%)] shadow-inner" />
        </div>

        <div className="flex min-w-0 flex-col gap-4 max-[370px]:w-full">
          {rings.map((ring) => (
            <div key={ring.key} className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[1.05rem] font-semibold">{ring.label}</span>
              <span
                className="shrink-0 text-sm font-semibold tabular-nums"
                style={{ color: ring.color }}
              >
                {ring.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ActivityRing({
  ring,
  radius,
  width,
  delayMs,
}: {
  ring: Ring;
  radius: number;
  width: number;
  delayMs: number;
}) {
  const progress = clampRing(ring.progress);
  const dashOffset = 100 - progress;

  return (
    <svg
      viewBox="0 0 128 128"
      aria-label={`${ring.label}: ${ring.value}`}
      className="absolute inset-0 h-full w-full -rotate-90"
    >
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={ring.color}
        strokeOpacity="0.18"
        strokeWidth={width}
      />
      <circle
        key={`${ring.key}-${progress}`}
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={ring.color}
        strokeLinecap="round"
        strokeWidth={width}
        pathLength={100}
        className="activity-ring-progress"
        style={{
          '--ring-offset': dashOffset,
          animationDelay: `${delayMs}ms`,
          strokeDasharray: 100,
          strokeDashoffset: 100,
        } as CSSProperties}
      />
    </svg>
  );
}
