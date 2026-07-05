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
import { NutritionCard } from './NutritionCard';
import { FoodSearchSheet } from './FoodSearchSheet';
import { CheckinSheet } from './CheckinSheet';

export function TodayClient({
  profile,
  initial,
}: {
  profile: TodayProfile;
  initial: TodaySnapshot;
}) {
  const { snapshot, logWater, toggleHabit, logFood, submitCheckin } = useToday(
    profile.timezone,
    initial,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [foodOpen, setFoodOpen] = useState(false);

  useEffect(() => {
    if (submitCheckin.isSuccess) setSheetOpen(false);
  }, [submitCheckin.isSuccess]);

  useEffect(() => {
    if (logFood.isSuccess) setFoodOpen(false);
  }, [logFood.isSuccess]);

  const level = levelFromExp(snapshot.expTotal);
  const checkedIn = snapshot.checkinStatus != null;

  const hour = localHour(profile.timezone);
  const timeGreeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  // Only treat as a real name if it looks like one (display_name), not an email prefix.
  const raw = profile.name.trim();
  const looksLikeName = /\s/.test(raw) || /[A-ZÀ-Ý]/.test(raw);
  const firstName = looksLikeName ? raw.split(/\s+/)[0] : null;
  const headerTitle = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;

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
    });

  const habit = profile.requiredHabit?.trim() || null;
  const water = profile.goalWaterMl;
  const mission = habit
    ? `Cumpra “${habit}”${water ? ` e beba ${water}ml de água` : ''}.`
    : 'Defina seu hábito nas configurações para receber a missão do dia.';

  const waterReached = water != null && snapshot.waterMl >= water;
  const defaultMissionDone = snapshot.habitDone && (water == null || waterReached);

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 py-10">
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

      <LevelHeader
        eyebrow="Hoje"
        title={headerTitle}
        level={level}
        streak={snapshot.streak}
      />

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

      <NutritionCard
        kcalToday={snapshot.kcalToday}
        proteinToday={snapshot.proteinToday}
        goalKcal={profile.goalKcal}
        goalProteinG={profile.goalProteinG}
        onOpen={() => setFoodOpen(true)}
      />

      <section className="grid grid-cols-2 gap-3">
        <ModuleCard assetKey="calories" title="Treino" />
        <ModuleCard assetKey="finances" title="Finanças" />
        <ModuleCard assetKey="sleep" title="Sono" />
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

      <FoodSearchSheet
        open={foodOpen}
        onClose={() => setFoodOpen(false)}
        onLog={(foodId, grams) => logFood.mutate({ foodId, grams })}
        pending={logFood.isPending}
      />

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
