import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { signOutAction } from './(auth)/actions';
import { levelFromExp } from '@/lib/exp-config';
import { computeDayStatus, type DaySnapshot } from '@/lib/day-status';
import { localHour } from '@/lib/date';
import { LevelHeader } from '@/components/dashboard/LevelHeader';
import { MissionCard } from '@/components/dashboard/MissionCard';
import { ModuleCard } from '@/components/dashboard/ModuleCard';

/**
 * Today Dashboard — M2. Real card layout + deterministic day-status badge.
 * Data is still zeroed (logs + EXP ledger arrive in M3); the snapshot below is
 * the seam the M3 quick logs will fill.
 */
export default async function TodayPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'display_name, timezone, goal_kcal, goal_protein_g, goal_water_ml, goal_spend_limit_brl, required_habit',
    )
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? 'America/Sao_Paulo';
  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'Lobo';

  // EXP ledger + streak arrive in M3 — baseline for now.
  const level = levelFromExp(0);
  const streak = 0;

  // Day snapshot (no logs yet → on_track).
  const snapshot: DaySnapshot = {
    localHour: localHour(timezone),
    checkinDone: false,
    missionAccomplished: false,
    missionFailed: false,
    yesterdayBroken: false,
  };
  const status = computeDayStatus(snapshot);

  const habit = profile?.required_habit?.trim();
  const water = profile?.goal_water_ml;
  const mission = habit
    ? `Cumpra “${habit}”${water ? ` e beba ${water}ml de água` : ''}.`
    : 'Defina seu hábito nas configurações para receber a missão do dia.';

  return (
    <main className="flex min-h-screen flex-col gap-5 px-5 py-8">
      <div className="flex items-start justify-between">
        <div className="flex-1" />
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Sair
          </button>
        </form>
      </div>

      <LevelHeader name={name} level={level} streak={streak} />

      <MissionCard mission={mission} status={status} />

      <section className="grid grid-cols-2 gap-3">
        <ModuleCard
          assetKey="water"
          title="Água"
          value={water ? `0 / ${water}ml` : null}
          action="Registrar água"
        />
        <ModuleCard
          assetKey="nutrition"
          title="Nutrição"
          value={
            profile?.goal_protein_g
              ? `0 / ${profile.goal_protein_g}g proteína`
              : null
          }
          action="Registrar refeição"
        />
        <ModuleCard assetKey="workout" title="Treino" value={null} action="Registrar treino" />
        <ModuleCard
          assetKey="money"
          title="Finanças"
          value={
            profile?.goal_spend_limit_brl != null
              ? `Limite R$ ${profile.goal_spend_limit_brl}`
              : null
          }
          action="Registrar gasto"
        />
      </section>

      <button
        type="button"
        disabled
        className="min-h-12 w-full rounded-2xl border bg-card text-sm font-semibold text-muted-foreground disabled:opacity-60"
      >
        Check-in da noite
      </button>
      <p className="-mt-3 text-center text-xs text-muted-foreground">
        As ações do dia e o check-in ganham vida no próximo passo.
      </p>
    </main>
  );
}
