import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchNotes } from '@/lib/notes';
import { NotesClient } from '@/components/notes/NotesClient';

export default async function NotasPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const initial = await fetchNotes(supabase);
  return <NotesClient userId={user.id} initial={initial} />;
}
