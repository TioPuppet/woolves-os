'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useNotes } from '@/hooks/useNotes';
import { noteTitle, notePreview, noteDate, type Note } from '@/lib/notes';
import { ThiingsAsset } from '@/components/ThiingsAsset';

function NoteEditor({
  note,
  onBack,
  onSave,
  onDelete,
}: {
  note: Note;
  onBack: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState(note.content);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(content);
  latest.current = content;

  // Debounced autosave.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(latest.current), 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, onSave]);

  const back = () => {
    if (timer.current) clearTimeout(timer.current);
    if (latest.current.trim() === '') onDelete();
    else onSave(latest.current);
    onBack();
  };

  return (
    <main className="flex min-h-screen flex-col px-5 pb-28 pt-10">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="press flex items-center gap-1 text-sm font-medium text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Notas
        </button>
        <button
          type="button"
          onClick={() => {
            onDelete();
            onBack();
          }}
          aria-label="Excluir nota"
          className="press text-muted-foreground hover:text-status-broken"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </header>

      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Comece a escrever…"
        className="min-h-[60vh] w-full flex-1 resize-none bg-transparent text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </main>
  );
}

export function NotesClient({
  userId,
  initial,
}: {
  userId: string;
  initial: Note[];
}) {
  const { notes, refetch, createNote, updateNote, deleteNote } = useNotes(
    userId,
    initial,
  );
  const [active, setActive] = useState<Note | null>(null);

  if (active) {
    return (
      <NoteEditor
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
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="journal" size={30} />
          <h1 className="text-xl font-semibold">Notas</h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            const n = await createNote.mutateAsync();
            setActive(n);
          }}
          aria-label="Nova nota"
          className="press flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma nota ainda. Toque em + para criar a primeira.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setActive(n)}
              className="press surface-2 flex flex-col gap-1 rounded-2xl p-4 text-left"
            >
              <span className="truncate text-sm font-semibold">
                {noteTitle(n.content)}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0">{noteDate(n.updated_at)}</span>
                <span className="min-w-0 truncate">{notePreview(n.content)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
