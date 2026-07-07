import type { SupabaseClient } from '@supabase/supabase-js';

export type KanbanStatus = 'todo' | 'doing' | 'done';

export const KANBAN_STATUSES: { key: KanbanStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'A fazer', color: '211 90% 58%' },
  { key: 'doing', label: 'Fazendo', color: '38 92% 55%' },
  { key: 'done', label: 'Feito', color: '145 63% 49%' },
];

export interface KanbanCard {
  id: number;
  title: string;
  status: KanbanStatus;
  position: number;
}

export async function fetchCards(client: SupabaseClient): Promise<KanbanCard[]> {
  const { data } = await client
    .from('kanban_cards')
    .select('id, title, status, position')
    .order('position');
  return (data ?? []) as KanbanCard[];
}
