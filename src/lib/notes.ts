import type { SupabaseClient } from '@supabase/supabase-js';

export interface Note {
  id: number;
  content: string;
  updated_at: string;
}

export function noteTitle(content: string): string {
  const first = content.split('\n')[0]?.trim() ?? '';
  return first || 'Nova nota';
}

export function notePreview(content: string): string {
  const rest = content.split('\n').slice(1).join(' ').trim();
  return rest || 'Sem texto adicional';
}

export function noteDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export async function fetchNotes(client: SupabaseClient): Promise<Note[]> {
  const { data } = await client
    .from('notes')
    .select('id, content, updated_at')
    .order('updated_at', { ascending: false });
  return (data ?? []) as Note[];
}
