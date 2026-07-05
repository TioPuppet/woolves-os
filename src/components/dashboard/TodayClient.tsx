'use client';

import { useEffect, useState } from 'react';
import { useToday } from '@/hooks/useToday';
import { type TodayProfile, type TodaySnapshot } from '@/lib/today';
import { levelFromExp } from '@/lib/exp-config';
import { computeDayStatus, type DayStatus, DAY_STATUS_META } from '@/lib/day-status';
import { localHour } from '@/lib/date';
import { signOutAction } from '@/app/(auth)/actions';
import { LevelHeader } from './LevelHeader';
import { MissionCard } from './MissionCard';
import { ModuleCard } from './ModuleCard';
import { WaterCard } from './WaterCard';
import { HabitCard } from './HabitCard';
import { CheckinSheet } from './CheckinSheet';

export function TodayClient({
  profile,
  initial,
}: {
  profile: TodayProfile;
  initial: TodaySnapshot;
}) {
  const { snapshot, logWater, toggleHabit, submitCheckin } = useToday(
    profile.timezone,
    initial,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (submitCheckin.isSuccess) setSheetOpen(false);
  }, [submitCheckin.isSuccess]);

  const level = levelFromExp(snapshot.expTotal);
  const checkedIn = snapshot.checkinStatus != null;

  const status: DayStatus =
    snapshot.checkinStatus ??
    computeDayStatus({
      localHour: localHour(profile.timezone),
      checkinDone: false,
      missionAccomplished: false,
      missionFailed: false,
      yesterdayBroken: false,
    });

  const habit = profile.requiredHabit?.trim() || null;
  const water = profile.goalWaterMl;
  const mission = habit
    ? `Cumpra “${habit}”${water ? ` e beba ${water}ml de água` : ''}.`
    : 'Defina seu hábito nas configurações para receber a missão do dia.';

  const waterReached = water != null && snapshot.waterMl >= water;
  const defaultMissionDone = snapshot.habitDone && (water == null || waterReached);

  return (
    <main className="flex min-h-screen flex-col gap-5 px-5 py-8">
      <div className="flex items-center justify-end">
        <form action={signOutAction}>
          <button
            type="submit"
            className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sair
          </button>
        </form>
      </div>

      <LevelHeader name={profile.name} level={level} streak={snapshot.streak} />

      <MissionCard mission={mission} status={status} />

      <WaterCard
        waterMl={snapshot.waterMl}
        goalMl={water}
        onAdd={(ml) => logWater.mutate(ml)}
        pending={logWater.isPending}
      />

      <HabitCard
        habit={habit}
        done={snapshot.habitDone}
        onToggle={(done) => toggleHabit.mutate(done)}
        pending={toggleHabit.isPending}
      />

      <section className="grid grid-cols-2 gap-3">
        <ModuleCard
          assetKey="nutrition"
          title="Nutrição"
          value={profile.goalProteinG ? `0 / ${profile.goalProteinG}g` : null}
          action="Em breve (M4)"
        />
        <ModuleCard assetKey="workout" title="Treino" value={null} action="Em breve (M5)" />
        <ModuleCard
          assetKey="money"
          title="Finanças"
          value={
            profile.goalSpendLimitBrl != null
              ? `Limite R$ ${profile.goalSpendLimitBrl}`
              : null
          }
          action="Em breve (M6)"
        />
        <ModuleCard assetKey="sleep" title="Sono" value={null} action="Em breve (M7)" />
      </section>

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
