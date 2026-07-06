import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { signOutAction } from '@/app/(auth)/actions';
import { levelFromExp, levelAssetKey } from '@/lib/exp-config';
import { ThiingsAsset } from '@/components/ThiingsAsset';

export default async function PerfilPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'display_name, required_habit, goal_kcal, goal_protein_g, goal_water_ml',
    )
    .eq('id', user.id)
    .maybeSingle();

  const { data: expTotal } = await supabase.rpc('get_exp_total');
  const level = levelFromExp(typeof expTotal === 'number' ? expTotal : 0);

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

      <section className="surface-2 flex items-center gap-4 rounded-3xl p-4">
        <div className="ring-gold flex h-14 w-14 items-center justify-center rounded-2xl bg-background/40">
          <ThiingsAsset assetKey={levelAssetKey(level.level)} size={40} alt={level.title} />
        </div>
        <div>
          <p className="text-base font-semibold">
            Nível {level.level} · {level.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
      </section>

      <section className="surface-2 rounded-3xl px-4">
        <Row label="E-mail" value={user.email ?? '—'} />
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
