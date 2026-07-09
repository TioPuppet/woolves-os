'use client';

import { useEffect, useState } from 'react';
import { useToday } from '@/hooks/useToday';
import { type TodayProfile, type TodaySnapshot } from '@/lib/today';
import { levelFromExp } from '@/lib/exp-config';
import { computeDayStatus, type DayStatus, DAY_STATUS_META } from '@/lib/day-status';
import { localHour } from '@/lib/date';
import { calledName } from '@/lib/greeting';
import { LevelHeader } from './LevelHeader';
import { MissionCard } from './MissionCard';
import { WaterCard } from './WaterCard';
import { HabitCard } from './HabitCard';
import { WeightCard } from './WeightCard';
import { AiCoachCard } from './AiCoachCard';
import { CheckinSheet } from './CheckinSheet';
import { WelcomeGate } from './WelcomeGate';

export function TodayClient({
  profile,
  initial,
}: {
  profile: TodayProfile;
  initial: TodaySnapshot;
}) {
  const {
    snapshot,
    logWater,
    removeWater,
    toggleHabit,
    logWeight,
    setMission,
    setMissionDone,
    submitCheckin,
  } = useToday(profile.userId, profile.timezone, initial);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (submitCheckin.isSuccess) setSheetOpen(false);
  }, [submitCheckin.isSuccess]);

  const level = levelFromExp(snapshot.expTotal);
  const checkedIn = snapshot.checkinStatus != null;

  const hour = localHour(profile.timezone);
  const timeGreeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const called = calledName(profile.title, profile.displayName);
  const headerTitle =
    called === 'Lobo' ? timeGreeting : `${timeGreeting}, ${called}`;

  const status: DayStatus =
    snapshot.checkinStatus ??
    computeDayStatus({
      localHour: localHour(profile.timezone),
      checkinDone: false,
      missionAccomplished: false,
      missionFailed: false,
      yesterdayBroken: false,
      protein: profile.goalProteinG
        ? { current: snapshot.proteinToday, goal: profile.goalProteinG }
        : undefined,
      spend: profile.goalSpendLimitBrl
        ? { current: snapshot.spentToday, goal: profile.goalSpendLimitBrl }
        : undefined,
    });

  const habit = profile.requiredHabit?.trim() || null;
  const water = profile.goalWaterMl;
  const proteinGoal = profile.goalProteinG;

  // Composite suggestion used to prefill the editable mission when it's empty.
  const targets: string[] = [];
  if (habit) targets.push(`cumprir “${habit}”`);
  if (water) targets.push(`beber ${water}ml de água`);
  if (proteinGoal) targets.push(`bater ${proteinGoal}g de proteína`);
  const suggestion = targets.length ? targets.join(', ') : '';

  const waterReached = water == null || snapshot.waterMl >= water;
  const proteinReached = proteinGoal == null || snapshot.proteinToday >= proteinGoal;
  const defaultMissionDone = snapshot.missionText
    ? snapshot.missionDone
    : snapshot.habitDone && waterReached && proteinReached;

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 pb-28 pt-10">
      <WelcomeGate
        userId={profile.userId}
        timezone={profile.timezone}
        name={called}
      />

      <LevelHeader
        eyebrow="Hoje"
        title={headerTitle}
        level={level}
        streak={snapshot.streak}
      />

      {/* Hábito obrigatório — logo abaixo do EXP */}
      <HabitCard
        habit={habit}
        done={snapshot.habitDone}
        onToggle={(done) => toggleHabit.mutate(done)}
        pending={toggleHabit.isPending}
      />

      {/* Missão do dia — editável */}
      <MissionCard
        text={snapshot.missionText}
        suggestion={suggestion}
        done={snapshot.missionDone}
        status={status}
        onSave={(t) => setMission.mutate(t)}
        onToggleDone={(d) => setMissionDone.mutate(d)}
      />

      <WaterCard
        waterMl={snapshot.waterMl}
        goalMl={water}
        onAdd={(ml) => logWater.mutate(ml)}
        onRemove={(ml) => removeWater.mutate(ml)}
        pending={logWater.isPending || removeWater.isPending}
      />

      <WeightCard
        latest={snapshot.latestWeight}
        prev={snapshot.prevWeight}
        onLog={(kg) => logWeight.mutate(kg)}
        pending={logWeight.isPending}
      />

      {checkedIn ? (
        <div className="rounded-2xl border border-status-completed/30 bg-status-completed/10 p-4 text-center">
          <p className="text-sm font-semibold text-status-completed">
            Dia fechado · {DAY_STATUS_META[status].label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Volte amanhã para uma nova missão.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="press min-h-12 w-full cursor-pointer rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Check-in da noite
        </button>
      )}

      {/* Woolves IA — no fim da página */}
      <AiCoachCard />

      <CheckinSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultMissionDone={defaultMissionDone}
        onSubmit={(v) => submitCheckin.mutate(v)}
        pending={submitCheckin.isPending}
      />
    </main>
  );
}
