'use client';

import { useEffect, useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { useToday } from '@/hooks/useToday';
import { type TodayProfile, type TodaySnapshot } from '@/lib/today';
import { levelFromExp } from '@/lib/exp-config';
import { computeDayStatus, type DayStatus, DAY_STATUS_META } from '@/lib/day-status';
import { localHour } from '@/lib/date';
import { calledName } from '@/lib/greeting';
import { LevelHeader } from './LevelHeader';
import { TodayCommand } from './TodayCommand';
import { MissionCard } from './MissionCard';
import { WaterCard } from './WaterCard';
import { HabitCard } from './HabitCard';
import { WeightCard } from './WeightCard';
import { AiCoachCard } from './AiCoachCard';
import { CheckinSheet } from './CheckinSheet';
import { CheckinVictory } from './CheckinVictory';
import { WelcomeGate } from './WelcomeGate';

interface LastCheckinResult {
  mood: number;
  missionDone: boolean;
}

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
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<LastCheckinResult | null>(null);

  useEffect(() => {
    if (submitCheckin.isSuccess && lastCheckin) {
      setSheetOpen(false);
      setVictoryOpen(true);
    }
  }, [lastCheckin, submitCheckin.isSuccess]);

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
  const missionRingComplete = snapshot.missionText != null && snapshot.missionDone;
  const habitRingComplete = habit == null || snapshot.habitDone;
  const waterRingComplete = waterReached;
  const activityRingsComplete =
    missionRingComplete && habitRingComplete && waterRingComplete;
  const displayStatus: DayStatus =
    snapshot.checkinStatus == null && activityRingsComplete
      ? 'completed'
      : status;
  const defaultMissionDone = snapshot.missionText
    ? snapshot.missionDone
    : snapshot.habitDone && waterReached && proteinReached;

  return (
    <main className="flex min-h-screen flex-col gap-5 px-5 pb-28 pt-10">
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

      <TodayCommand
        status={displayStatus}
        missionText={snapshot.missionText}
        missionDone={snapshot.missionDone}
        habit={habit}
        habitDone={snapshot.habitDone}
        waterMl={snapshot.waterMl}
        waterGoalMl={water}
        proteinToday={snapshot.proteinToday}
        proteinGoal={proteinGoal}
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
        status={displayStatus}
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
        <DayClosedCard
          status={status}
          streak={snapshot.streak}
          missionDone={snapshot.missionDone}
        />
      ) : (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="press min-h-12 w-full cursor-pointer rounded-2xl border border-primary/25 bg-primary/15 text-sm font-semibold text-primary transition hover:bg-primary/20"
        >
          Fechar dungeon do dia
        </button>
      )}

      {/* Woolves IA — no fim da página */}
      <AiCoachCard />

      <CheckinSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultMissionDone={defaultMissionDone}
        onSubmit={(v) => {
          setLastCheckin({ mood: v.mood, missionDone: v.missionDone });
          submitCheckin.mutate(v);
        }}
        pending={submitCheckin.isPending}
      />
      <CheckinVictory
        open={victoryOpen && lastCheckin !== null}
        mood={lastCheckin?.mood ?? 3}
        missionDone={lastCheckin?.missionDone ?? false}
        status={status}
        streak={snapshot.streak}
        onClose={() => setVictoryOpen(false)}
      />
    </main>
  );
}

function DayClosedCard({
  status,
  streak,
  missionDone,
}: {
  status: DayStatus;
  streak: number;
  missionDone: boolean;
}) {
  return (
    <section className="victory-card rounded-[1.75rem] border border-white/[0.08] p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] ring-1 ring-primary/20">
          <ThiingsAsset assetKey={missionDone ? 'trophy' : 'award'} size={50} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Campanha encerrada
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            {DAY_STATUS_META[status].label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {missionDone
              ? 'Quest principal registrada. Amanhã nasce uma nova caçada.'
              : 'O dia foi fechado. Amanhã você volta com nova estratégia.'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Streak
          </p>
          <p className="mt-1 text-lg font-bold text-primary">{streak} dias</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Próxima run
          </p>
          <p className="mt-1 text-lg font-bold">Amanhã</p>
        </div>
      </div>
    </section>
  );
}
