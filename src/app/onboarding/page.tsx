import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="flex min-h-screen flex-col gap-6 px-6 py-10">
      <header className="flex items-center gap-3">
        <ThiingsAsset assetKey="purpose" size={44} />
        <div>
          <h1 className="text-lg font-semibold">Vamos calibrar seu jogo</h1>
          <p className="text-sm text-muted-foreground">
            Leva 1 minuto. Você pode ajustar depois.
          </p>
        </div>
      </header>
      <OnboardingForm />
    </main>
  );
}
