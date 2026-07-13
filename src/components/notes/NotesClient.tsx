'use client';

import { useMemo, useState } from 'react';
import { useNotes } from '@/hooks/useNotes';
import {
  emptyDoc,
  newBlockId,
  noteIcon,
  noteLinks,
  notePreview,
  noteTitle,
  serializeDoc,
  type Note,
} from '@/lib/notes';
import { type Board } from '@/lib/kanban';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { KanbanBoard } from './KanbanBoard';
import { PageEditor } from './PageEditor';
import { FocusPanel } from './FocusPanel';

type WorkspaceView = 'inicio' | 'paginas' | 'quadro' | 'foco';

function viewLabel(view: WorkspaceView): string {
  return { inicio: 'Visão geral', paginas: 'Páginas', quadro: 'Quadro', foco: 'Foco' }[view];
}

function NoteRow({
  note,
  onOpen,
  onPin,
  onArchive,
}: {
  note: Note;
  onOpen: () => void;
  onPin: () => void;
  onArchive: () => void;
}) {
  const links = noteLinks(note.content);
  return (
    <div className="surface-2 group flex items-center gap-3 rounded-2xl p-3 sm:p-4">
      <button type="button" onClick={onOpen} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card text-2xl">{noteIcon(note.content)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{noteTitle(note.content)}</span>
            {note.pinned && <span className="shrink-0 text-xs text-primary" aria-label="Página fixada">★</span>}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">{notePreview(note.content)}</span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">#{tag}</span>)}
            {links.length > 0 && <span className="rounded-md bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">{links.length} link{links.length === 1 ? '' : 's'}</span>}
          </span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onPin} aria-label={note.pinned ? 'Desafixar página' : 'Fixar página'} className="press flex h-10 w-10 items-center justify-center rounded-xl text-sm text-muted-foreground hover:text-primary">
          {note.pinned ? '★' : '☆'}
        </button>
        <button type="button" onClick={onArchive} aria-label="Arquivar página" className="press flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-status-broken">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function NotesClient({
  userId,
  initialNotes,
  initialBoard,
}: {
  userId: string;
  initialNotes: Note[];
  initialBoard: Board;
}) {
  const { notes, refetch, createNote, updateNote, updateNoteMeta, deleteNote } = useNotes(userId, initialNotes);
  const [view, setView] = useState<WorkspaceView>('inicio');
  const [active, setActive] = useState<Note | null>(null);
  const [query, setQuery] = useState('');
  const [capture, setCapture] = useState('');

  const filteredNotes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...notes]
      .filter((note) => !term || `${noteTitle(note.content)} ${notePreview(note.content)} ${note.tags.join(' ')}`.toLowerCase().includes(term))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [notes, query]);

  const openNewPage = async () => {
    const note = await createNote.mutateAsync();
    setActive(note);
    setView('paginas');
  };

  const quickCapture = async () => {
    const text = capture.trim();
    if (!text) return;
    const note = await createNote.mutateAsync();
    const doc = emptyDoc();
    doc.icon = '💡';
    doc.blocks = [{ id: newBlockId(), type: 'text', text }];
    const content = serializeDoc(doc);
    await updateNote.mutateAsync({ id: note.id, content });
    setCapture('');
    setView('paginas');
    setActive({ ...note, content });
  };

  if (active) {
    return (
      <PageEditor
        note={active}
        onBack={() => {
          setActive(null);
          void refetch();
        }}
        onSave={(content) => {
          updateNote.mutate({ id: active.id, content });
          setActive((current) => current ? { ...current, content, updated_at: new Date().toISOString() } : current);
        }}
        onMetaChange={(patch) => {
          updateNoteMeta.mutate({ id: active.id, ...patch });
          setActive((current) => current ? { ...current, ...patch } : current);
        }}
        onDelete={() => deleteNote.mutate(active.id)}
      />
    );
  }

  const pinned = notes.filter((note) => note.pinned).slice(0, 3);
  const openCards = initialBoard.cards.filter((card) => card.list_id != null).length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-5 pb-28 pt-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="journal" size={32} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Espaço pessoal</p>
            <h1 className="mt-1 text-2xl font-semibold">Seu centro de comando.</h1>
          </div>
        </div>
        <button type="button" onClick={() => void openNewPage()} aria-label="Nova página" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card/35 p-1" aria-label="Seções do Espaço">
        {(['inicio', 'paginas', 'quadro', 'foco'] as const).map((item) => (
          <button key={item} type="button" onClick={() => setView(item)} className={cn('press min-h-10 rounded-xl text-xs font-semibold transition-colors sm:text-sm', view === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            {viewLabel(item)}
          </button>
        ))}
      </nav>

      {view === 'inicio' && (
        <div className="flex flex-col gap-4">
          <section className="workspace-command rounded-[1.75rem] p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Captura imediata</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">Tire da cabeça. Dê um lugar.</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Ideias, decisões e próximos movimentos reunidos em um só espaço.</p>
              </div>
              <ThiingsAsset assetKey="journal" size={42} />
            </div>
            <div className="mt-5 flex gap-2 rounded-2xl border border-border bg-black/15 p-1.5">
              <input value={capture} onChange={(event) => setCapture(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void quickCapture(); }} placeholder="Capturar uma ideia ou tarefa…" className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/70" />
              <button type="button" onClick={() => void quickCapture()} disabled={!capture.trim() || createNote.isPending || updateNote.isPending} className="press min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">Guardar</button>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            {[
              ['Páginas', String(notes.length), 'journal'],
              ['Cartões', String(openCards), 'target'],
              ['Próximo', 'Foco', 'ai'],
            ].map(([label, value, icon]) => (
              <button key={label} type="button" onClick={() => setView(label === 'Páginas' ? 'paginas' : label === 'Cartões' ? 'quadro' : 'foco')} className="surface-2 press rounded-2xl p-3 text-left sm:p-4">
                <ThiingsAsset assetKey={icon as 'journal' | 'target' | 'ai'} size={25} />
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </button>
            ))}
          </section>

          {pinned.length > 0 && (
            <section className="surface-2 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Fixadas</p><h2 className="mt-1 text-lg font-semibold">O que merece voltar à vista</h2></div>
                <span className="text-primary">★</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {pinned.map((note) => <NoteRow key={note.id} note={note} onOpen={() => setActive(note)} onPin={() => updateNoteMeta.mutate({ id: note.id, pinned: false })} onArchive={() => updateNoteMeta.mutate({ id: note.id, archived: true })} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {view === 'paginas' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Conhecimento</p><h2 className="mt-1 text-2xl font-semibold">Páginas</h2></div>
            <button type="button" onClick={() => void openNewPage()} className="press min-h-10 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">Nova página</button>
          </div>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card/35 px-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-muted-foreground"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar páginas, tags e ideias" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" />
          </label>
          {filteredNotes.length === 0 ? <div className="surface-2 rounded-2xl p-8 text-center text-sm text-muted-foreground">Nenhuma página encontrada.</div> : <div className="grid gap-2">{filteredNotes.map((note) => <NoteRow key={note.id} note={note} onOpen={() => setActive(note)} onPin={() => updateNoteMeta.mutate({ id: note.id, pinned: !note.pinned })} onArchive={() => updateNoteMeta.mutate({ id: note.id, archived: true })} />)}</div>}
        </section>
      )}

      {view === 'quadro' && <KanbanBoard userId={userId} initial={initialBoard} />}
      {view === 'foco' && <FocusPanel userId={userId} notes={notes.map((note) => ({ id: note.id, title: noteTitle(note.content) }))} cards={initialBoard.cards.map((card) => ({ id: card.id, title: card.title }))} />}
    </main>
  );
}
