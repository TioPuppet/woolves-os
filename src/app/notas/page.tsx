import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchNotes } from '@/lib/notes';
import { fetchBoard } from '@/lib/kanban';
import { NotesClient } from '@/components/notes/NotesClient';

export default async function NotasPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [initialNotes, initialBoard] = await Promise.all([
    fetchNotes(supabase),
    fetchBoard(supabase),
  ]);

  return (
    <NotesClient
      userId={user.id}
      initialNotes={initialNotes}
      initialBoard={initialBoard}
    />
  );
}
