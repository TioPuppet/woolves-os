'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchCards, type KanbanCard, type KanbanStatus } from '@/lib/kanban';

const KEY = ['kanban'] as const;

export function useKanban(userId: string, initial: KanbanCard[]) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchCards(supabase),
    initialData: initial,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const addCard = useMutation({
    mutationFn: async (v: { title: string; status: KanbanStatus }) => {
      const { error } = await supabase.from('kanban_cards').insert({
        user_id: userId,
        title: v.title.trim(),
        status: v.status,
        position: Date.now(),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const moveCard = useMutation({
    mutationFn: async (v: { id: number; status: KanbanStatus }) => {
      const { error } = await supabase
        .from('kanban_cards')
        .update({ status: v.status })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCard = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { cards: query.data ?? initial, addCard, moveCard, deleteCard };
}
