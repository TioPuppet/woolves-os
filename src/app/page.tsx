import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { signOutAction } from './(auth)/actions';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { levelFromExp } from '@/lib/exp-config';

/**
 * Today Dashboard — M1 version. The full card layout + day-status engine land
 * in M2/M3. For now this proves the dashboard-first flow: an onboarded user
 * lands here with their profile and goals loaded.
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
      'display_name, goal_kcal, goal_protein_g, goal_water_ml, required_habit',
    )
    .eq('id', user.id)
    .maybeSingle();

  // EXP ledger arrives in M3; show level 1 baseline for now.
  const lvl = levelFromExp(0);
  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'Lobo';

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ThiingsAsset assetKey="pack" size={44} />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Hoje
            </p>
            <h1 className="text-lg font-semibold">Olá, {name}</h1>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Sair
          </button>
        </form>
      </header>

      <section className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <ThiingsAsset assetKey="life_exp" size={32} />
        <div>
          <p className="text-sm font-medium">
            Nível {lvl.level} · {lvl.title}
          </p>
          <p className="text-xs text-muted-foreground">
            O loop diário (missão, EXP, streak) chega no M3.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Suas metas</h2>
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">kcal</dt>
            <dd className="text-base font-semibold">{profile?.goal_kcal ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Proteína</dt>
            <dd className="text-base font-semibold">
              {profile?.goal_protein_g ?? '—'}g
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Água</dt>
            <dd className="text-base font-semibold">
              {profile?.goal_water_ml ?? '—'}ml
            </dd>
          </div>
        </dl>
        {profile?.required_habit ? (
          <p className="mt-4 text-sm">
            <span className="text-muted-foreground">Hábito obrigatório: </span>
            {profile.required_habit}
          </p>
        ) : null}
      </section>
    </main>
  );
}
