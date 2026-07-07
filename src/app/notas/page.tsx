import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchNotes } from '@/lib/notes';
import { fetchCards } from '@/lib/kanban';
import { NotesClient } from '@/components/notes/NotesClient';

export default async function NotasPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [initialNotes, initialCards] = await Promise.all([
    fetchNotes(supabase),
    fetchCards(supabase),
  ]);

  return (
    <NotesClient
      userId={user.id}
      initialNotes={initialNotes}
      initialCards={initialCards}
    />
  );
}
