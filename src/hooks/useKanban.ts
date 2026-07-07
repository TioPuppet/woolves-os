'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  fetchBoard,
  type Board,
  type KanbanCard,
  type ChecklistItem,
} from '@/lib/kanban';

const KEY = ['board'] as const;

export type CardPatch = Partial<{
  title: string;
  description: string | null;
  due_date: string | null;
  labels: string[];
  checklist: ChecklistItem[];
}>;

export function useKanban(userId: string, initial: Board) {
  const qc = useQueryClient();
  const supabase = getSupabaseBrowserClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchBoard(supabase),
    initialData: initial,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  // ---- Lists ----
  const addList = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from('kanban_lists').insert({
        user_id: userId,
        title: title.trim(),
        position: Date.now(),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const renameList = useMutation({
    mutationFn: async (v: { id: number; title: string }) => {
      const { error } = await supabase
        .from('kanban_lists')
        .update({ title: v.title.trim() })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteList = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('kanban_lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // ---- Cards ----
  const addCard = useMutation({
    mutationFn: async (v: { list_id: number; title: string }) => {
      const { error } = await supabase.from('kanban_cards').insert({
        user_id: userId,
        list_id: v.list_id,
        title: v.title.trim(),
        position: Date.now(),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateCard = useMutation({
    mutationFn: async (v: { id: number } & CardPatch) => {
      const { id, ...patch } = v;
      const { error } = await supabase
        .from('kanban_cards')
        .update(patch)
        .eq('id', id);
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

  /** Persist reordering / cross-list moves after a drag. */
  const savePositions = useMutation({
    mutationFn: async (
      updates: { id: number; list_id: number; position: number }[],
    ) => {
      await Promise.all(
        updates.map((u) =>
          supabase
            .from('kanban_cards')
            .update({ list_id: u.list_id, position: u.position })
            .eq('id', u.id),
        ),
      );
    },
    onSuccess: invalidate,
  });

  const board: Board = query.data ?? initial;

  return {
    board,
    cards: board.cards as KanbanCard[],
    lists: board.lists,
    addList,
    renameList,
    deleteList,
    addCard,
    updateCard,
    deleteCard,
    savePositions,
  };
}
