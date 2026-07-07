import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { WeeklyReportClient } from '@/components/ai/WeeklyReportClient';

export default async function RelatorioPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <WeeklyReportClient />;
}
