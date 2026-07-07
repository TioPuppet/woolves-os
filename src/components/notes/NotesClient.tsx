'use client';

import { useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import { noteTitle, notePreview, noteDate, noteIcon, type Note } from '@/lib/notes';
import { type Board } from '@/lib/kanban';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { KanbanBoard } from './KanbanBoard';
import { PageEditor } from './PageEditor';

export function NotesClient({
  userId,
  initialNotes,
  initialBoard,
}: {
  userId: string;
  initialNotes: Note[];
  initialBoard: Board;
}) {
  const { notes, refetch, createNote, updateNote, deleteNote } = useNotes(
    userId,
    initialNotes,
  );
  const [view, setView] = useState<'paginas' | 'quadro'>('paginas');
  const [active, setActive] = useState<Note | null>(null);

  if (active) {
    return (
      <PageEditor
        note={active}
        onBack={() => {
          setActive(null);
          refetch();
        }}
        onSave={(content) => updateNote.mutate({ id: active.id, content })}
        onDelete={() => deleteNote.mutate(active.id)}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 px-5 pb-28 pt-10">
      <header className="flex items-center gap-2.5">
        <ThiingsAsset assetKey="journal" size={30} />
        <h1 className="text-xl font-semibold">Espaço</h1>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {(['paginas', 'quadro'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'press min-h-10 rounded-xl border text-sm font-medium transition-colors',
              view === v
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted-foreground',
            )}
          >
            {v === 'paginas' ? 'Páginas' : 'Quadro'}
          </button>
        ))}
      </div>

      {view === 'paginas' ? (
        <>
          <button
            type="button"
            onClick={async () => {
              const n = await createNote.mutateAsync();
              setActive(n);
            }}
            className="press flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Nova página
          </button>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma página ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {notes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setActive(n)}
                  className="press surface-2 flex items-center gap-3 rounded-2xl p-4 text-left"
                >
                  <span className="shrink-0 text-2xl leading-none">{noteIcon(n.content)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{noteTitle(n.content)}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0">{noteDate(n.updated_at)}</span>
                      <span className="min-w-0 truncate">{notePreview(n.content)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <KanbanBoard userId={userId} initial={initialBoard} />
      )}
    </main>
  );
}
