import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { throwIfSupabaseError } from '@/lib/supabase/errors';
import { signOutAction } from '@/app/(auth)/actions';
import {
  removeProfileAvatar,
  updateProfileAvatar,
  updateProfileName,
} from './actions';
import { levelFromExp, levelAssetKey } from '@/lib/exp-config';
import { calledName, TITLES } from '@/lib/greeting';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

interface JourneyStats {
  checkins: number;
  completedDays: number;
  brokenDays: number;
  missionsDone: number;
  expTotal: number;
}

function rankForLevel(level: number): string {
  if (level >= 8) return 'Lenda da Alcateia';
  if (level >= 6) return 'Alfa de Campanha';
  if (level >= 4) return 'Caçador Disciplinado';
  if (level >= 2) return 'Lobo em Ascensão';
  return 'Primeiro Uivo';
}

function nextLevelText(level: ReturnType<typeof levelFromExp>): string {
  if (level.span === Infinity) return 'Rank máximo definido';
  const remaining = Math.max(0, level.span - level.intoLevel);
  return `${remaining} EXP para o próximo nível`;
}

async function fetchJourneyStats(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<JourneyStats> {
  const [checkins, missions, expTotal] = await Promise.all([
    supabase.from('checkins').select('day_status'),
    supabase.from('daily_missions').select('done').eq('done', true),
    supabase.rpc('get_exp_total'),
  ]);

  throwIfSupabaseError(checkins.error, 'profile checkins');
  throwIfSupabaseError(missions.error, 'profile missions');
  throwIfSupabaseError(expTotal.error, 'profile exp');

  const checkinRows = (checkins.data ?? []) as { day_status: string | null }[];

  return {
    checkins: checkinRows.length,
    completedDays: checkinRows.filter((r) => r.day_status === 'completed').length,
    brokenDays: checkinRows.filter((r) => r.day_status === 'broken').length,
    missionsDone: (missions.data ?? []).length,
    expTotal: typeof expTotal.data === 'number' ? expTotal.data : 0,
  };
}

export default async function PerfilPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'title, display_name, avatar_url, required_habit, goal_kcal, goal_protein_g, goal_water_ml',
    )
    .eq('id', user.id)
    .maybeSingle();
  throwIfSupabaseError(profileError, 'profile page');

  const stats = await fetchJourneyStats(supabase);
  const level = levelFromExp(stats.expTotal);
  const called = calledName(profile?.title, profile?.display_name);
  const levelPct = Math.round(level.progress * 100);
  const rank = rankForLevel(level.level);
  const winRate =
    stats.checkins > 0 ? Math.round((stats.completedDays / stats.checkins) * 100) : 0;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 pb-28 pt-10">
      <header className="flex items-center gap-3">
        <ThiingsAsset assetKey="settings" size={28} />
        <h1 className="text-xl font-semibold">Perfil</h1>
      </header>

      <section className="profile-hero rounded-[2rem] border border-white/[0.08] p-5">
        <div className="flex items-start gap-4">
          <details className="group/avatar relative z-10 shrink-0">
            <summary className="list-none [&::-webkit-details-marker]:hidden">
              <span className="ring-gold relative grid h-24 w-24 cursor-pointer place-items-center overflow-hidden rounded-[1.75rem] bg-background/40">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={called}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ThiingsAsset
                    assetKey={levelAssetKey(level.level)}
                    size={76}
                    alt={level.title}
                  />
                )}
                <span className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/70 text-primary shadow-lg backdrop-blur">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M4 20h4L19 9l-4-4L4 16v4Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13.5 6.5l4 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            </summary>

            <div className="absolute left-0 top-[6.75rem] w-64 rounded-3xl border border-white/[0.08] bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
              <form action={updateProfileAvatar} className="grid gap-2">
                <label className="press flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 px-4 text-sm font-semibold text-primary">
                  Escolher foto
                  <input
                    name="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                  />
                </label>
                <button
                  type="submit"
                  className="press min-h-11 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
                >
                  Salvar foto
                </button>
              </form>
              <form action={removeProfileAvatar} className="mt-2">
                <button
                  type="submit"
                  className="press min-h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-muted-foreground"
                >
                  Remover foto
                </button>
              </form>
            </div>
          </details>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Personagem
            </p>
            <h2 className="mt-1 max-w-full text-balance break-words text-2xl font-semibold leading-tight sm:text-3xl">
              {called === 'Lobo' ? user.email : called}
            </h2>
            <p className="mt-1 text-sm font-semibold text-primary">
              {rank}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nível {level.level} · {level.title}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              EXP de vida
            </span>
            <span className="text-xs font-bold tabular-nums text-primary">
              {level.intoLevel}
              {level.span === Infinity ? '' : ` / ${level.span}`}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${levelPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {nextLevelText(level)}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="EXP total" value={String(stats.expTotal)} asset="life_exp" />
        <StatCard label="Check-ins" value={String(stats.checkins)} asset="journal" />
        <StatCard label="Vitórias" value={String(stats.completedDays)} asset="trophy" />
        <StatCard label="Taxa" value={`${winRate}%`} asset="target" />
      </section>

      <section className="surface-2 rounded-3xl p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Conquistas
            </p>
            <h2 className="mt-1 text-xl font-semibold">Marcos da jornada</h2>
          </div>
          <ThiingsAsset assetKey="award" size={42} />
        </div>

        <div className="grid gap-2">
          <Achievement
            unlocked={stats.checkins >= 1}
            title="Primeiro registro"
            detail="Fechar o primeiro dia de campanha."
          />
          <Achievement
            unlocked={stats.completedDays >= 7}
            title="Semana dominante"
            detail="Conquistar 7 dias completos."
          />
          <Achievement
            unlocked={stats.missionsDone >= 10}
            title="Executor de quests"
            detail="Concluir 10 missões principais."
          />
          <Achievement
            unlocked={level.level >= 5}
            title="Ascensão de rank"
            detail="Chegar ao nível 5."
          />
        </div>
      </section>

      <form
        action={updateProfileName}
        className="surface-2 flex flex-col gap-3 rounded-3xl p-4"
      >
        <p className="text-sm font-medium">Como quer ser chamado?</p>
        <div className="grid grid-cols-[6.5rem_1fr] gap-2">
          <select
            name="title"
            defaultValue={profile?.title ?? ''}
            aria-label="Tratamento"
            className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            {TITLES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ''}
            placeholder="Seu nome"
            className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>
        <button
          type="submit"
          className="press min-h-11 w-full cursor-pointer rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          Salvar
        </button>
      </form>

      <section className="surface-2 rounded-3xl px-4">
        <Row label="E-mail" value={user.email ?? '—'} />
        <Row label="Rank atual" value={rank} />
        <Row label="Dias quebrados" value={String(stats.brokenDays)} />
        <Row label="Meta de calorias" value={profile?.goal_kcal ? `${profile.goal_kcal} kcal` : '—'} />
        <Row label="Meta de proteína" value={profile?.goal_protein_g ? `${profile.goal_protein_g} g` : '—'} />
        <Row label="Meta de água" value={profile?.goal_water_ml ? `${profile.goal_water_ml} ml` : '—'} />
        <Row label="Hábito obrigatório" value={profile?.required_habit ?? '—'} />
      </section>

      <form action={signOutAction}>
        <button
          type="submit"
          className="press min-h-12 w-full cursor-pointer rounded-2xl border border-status-broken/30 bg-status-broken/10 text-sm font-semibold text-status-broken"
        >
          Sair
        </button>
      </form>
    </main>
  );
}

function StatCard({
  label,
  value,
  asset,
}: {
  label: string;
  value: string;
  asset: 'life_exp' | 'journal' | 'trophy' | 'target';
}) {
  return (
    <div className="surface-2 rounded-3xl p-4">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04]">
        <ThiingsAsset assetKey={asset} size={36} />
      </div>
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Achievement({
  unlocked,
  title,
  detail,
}: {
  unlocked: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3',
        unlocked
          ? 'border-primary/25 bg-primary/10'
          : 'border-white/[0.06] bg-white/[0.03] opacity-70',
      )}
    >
      <div
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
          unlocked ? 'bg-primary/15' : 'bg-white/[0.04]',
        )}
      >
        <ThiingsAsset assetKey={unlocked ? 'trophy' : 'award'} size={30} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
