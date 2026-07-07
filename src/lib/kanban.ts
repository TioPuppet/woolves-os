import type { SupabaseClient } from '@supabase/supabase-js';

export interface KanbanList {
  id: number;
  title: string;
  position: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface KanbanCard {
  id: number;
  list_id: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  labels: string[];
  checklist: ChecklistItem[];
  position: number;
}

/** Trello-style label palette (key → hsl + pt-BR name). */
export const CARD_LABELS: { key: string; color: string; label: string }[] = [
  { key: 'green', color: '145 63% 45%', label: 'Verde' },
  { key: 'yellow', color: '46 96% 50%', label: 'Amarelo' },
  { key: 'orange', color: '28 92% 54%', label: 'Laranja' },
  { key: 'red', color: '0 74% 56%', label: 'Vermelho' },
  { key: 'purple', color: '252 83% 66%', label: 'Roxo' },
  { key: 'blue', color: '211 90% 55%', label: 'Azul' },
];

export function labelColor(key: string): string {
  return CARD_LABELS.find((l) => l.key === key)?.color ?? '240 5% 55%';
}

/** Default lists created the first time a user opens an empty board. */
export const DEFAULT_LISTS = ['A fazer', 'Fazendo', 'Feito'];

export interface Board {
  lists: KanbanList[];
  cards: KanbanCard[];
}

function normalizeCard(row: Record<string, unknown>): KanbanCard {
  const checklist = Array.isArray(row.checklist)
    ? (row.checklist as ChecklistItem[])
    : [];
  const labels = Array.isArray(row.labels) ? (row.labels as string[]) : [];
  return {
    id: row.id as number,
    list_id: (row.list_id as number | null) ?? null,
    title: (row.title as string) ?? '',
    description: (row.description as string | null) ?? null,
    due_date: (row.due_date as string | null) ?? null,
    labels,
    checklist,
    position: (row.position as number) ?? 0,
  };
}

export async function fetchBoard(client: SupabaseClient): Promise<Board> {
  const [listsRes, cardsRes] = await Promise.all([
    client.from('kanban_lists').select('id, title, position').order('position'),
    client
      .from('kanban_cards')
      .select('id, list_id, title, description, due_date, labels, checklist, position')
      .order('position'),
  ]);
  return {
    lists: (listsRes.data ?? []) as KanbanList[],
    cards: ((cardsRes.data ?? []) as Record<string, unknown>[]).map(normalizeCard),
  };
}

/** Overdue / due-soon flag for a due_date string (YYYY-MM-DD), local. */
export function dueState(
  due: string | null,
  todayStr: string,
): 'overdue' | 'today' | 'soon' | 'none' {
  if (!due) return 'none';
  if (due < todayStr) return 'overdue';
  if (due === todayStr) return 'today';
  return 'soon';
}
