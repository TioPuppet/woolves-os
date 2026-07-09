import type { SupabaseClient } from '@supabase/supabase-js';
import { throwIfSupabaseError } from '@/lib/supabase/errors';

export interface Note {
  id: number;
  content: string;
  updated_at: string;
}

/* ------------------------------------------------------------- Block model */

export type BlockType = 'text' | 'h1' | 'h2' | 'todo' | 'bullet';

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}

export interface NoteDoc {
  icon: string;
  blocks: Block[];
}

export const DEFAULT_ICON = '📝';

export const BLOCK_MENU: { type: BlockType; label: string; hint: string }[] = [
  { type: 'text', label: 'Texto', hint: 'Parágrafo simples' },
  { type: 'h1', label: 'Título', hint: 'Cabeçalho grande' },
  { type: 'h2', label: 'Subtítulo', hint: 'Cabeçalho médio' },
  { type: 'todo', label: 'Lista de tarefas', hint: 'Caixa de seleção' },
  { type: 'bullet', label: 'Lista com marcadores', hint: 'Item com ponto' },
];

export function newBlockId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyDoc(): NoteDoc {
  return { icon: DEFAULT_ICON, blocks: [{ id: newBlockId(), type: 'text', text: '' }] };
}

/** Parse stored content into a NoteDoc, tolerating legacy plain-text notes. */
export function parseDoc(content: string): NoteDoc {
  const raw = content?.trim() ?? '';
  if (raw.startsWith('{')) {
    try {
      const obj = JSON.parse(raw) as Partial<NoteDoc>;
      if (obj && Array.isArray(obj.blocks)) {
        return {
          icon: typeof obj.icon === 'string' && obj.icon ? obj.icon : DEFAULT_ICON,
          blocks: obj.blocks.length
            ? obj.blocks.map((b) => ({
                id: b.id ?? newBlockId(),
                type: (b.type ?? 'text') as BlockType,
                text: b.text ?? '',
                ...(b.checked != null ? { checked: b.checked } : {}),
              }))
            : emptyDoc().blocks,
        };
      }
    } catch {
      /* fall through to plain-text handling */
    }
  }
  // Legacy plain text → one text block per line.
  const lines = raw.split('\n');
  const blocks: Block[] = lines.map((line) => ({
    id: newBlockId(),
    type: 'text',
    text: line,
  }));
  return { icon: DEFAULT_ICON, blocks: blocks.length ? blocks : emptyDoc().blocks };
}

export function serializeDoc(doc: NoteDoc): string {
  return JSON.stringify(doc);
}

function firstText(doc: NoteDoc): string {
  for (const b of doc.blocks) {
    if (b.text.trim()) return b.text.trim();
  }
  return '';
}

export function noteIcon(content: string): string {
  return parseDoc(content).icon;
}

export function noteTitle(content: string): string {
  return firstText(parseDoc(content)) || 'Sem título';
}

export function notePreview(content: string): string {
  const doc = parseDoc(content);
  const title = firstText(doc);
  const rest = doc.blocks
    .map((b) => b.text.trim())
    .filter((t) => t && t !== title)
    .join(' ')
    .trim();
  return rest || 'Página vazia';
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
  const { data, error } = await client
    .from('notes')
    .select('id, content, updated_at')
    .order('updated_at', { ascending: false });
  throwIfSupabaseError(error, 'fetchNotes');
  return (data ?? []) as Note[];
}
