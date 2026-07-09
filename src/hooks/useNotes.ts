'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchNotes, type Note } from '@/lib/notes';

export function useNotes(userId: string, initial: Note[]) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();
  const key = ['notes', userId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchNotes(supabase),
    initialData: initial,
    staleTime: 10_000,
  });

  const createNote = useMutation({
    mutationFn: async (): Promise<Note> => {
      const { data, error } = await supabase
        .from('notes')
        .insert({ user_id: userId, content: '' })
        .select('id, content, updated_at')
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateNote = useMutation({
    mutationFn: async (v: { id: number; content: string }) => {
      const { error } = await supabase
        .from('notes')
        .update({ content: v.content, updated_at: new Date().toISOString() })
        .eq('id', v.id);
      if (error) throw error;
    },
    // No invalidate on each keystroke; the list refreshes when returning.
  });

  const deleteNote = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    notes: query.data ?? initial,
    refetch: () => qc.invalidateQueries({ queryKey: key }),
    createNote,
    updateNote,
    deleteNote,
  };
}
