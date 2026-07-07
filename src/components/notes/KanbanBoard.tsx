'use client';

import { useState } from 'react';
import { useKanban } from '@/hooks/useKanban';
import {
  KANBAN_STATUSES,
  type KanbanCard,
  type KanbanStatus,
} from '@/lib/kanban';

const NEXT: Record<KanbanStatus, KanbanStatus | null> = {
  todo: 'doing',
  doing: 'done',
  done: null,
};
const PREV: Record<KanbanStatus, KanbanStatus | null> = {
  todo: null,
  doing: 'todo',
  done: 'doing',
};

function Column({
  col,
  cards,
  onAdd,
  onMove,
  onDelete,
  busy,
}: {
  col: { key: KanbanStatus; label: string; color: string };
  cards: KanbanCard[];
  onAdd: (title: string) => void;
  onMove: (id: number, status: KanbanStatus) => void;
  onDelete: (id: number) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState('');
  return (
    <div className="surface-2 flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(${col.color})` }} />
        <h3 className="text-sm font-semibold">{col.label}</h3>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
      </div>

      {cards.map((c) => (
        <div key={c.id} className="surface-1 rise flex items-center gap-2 rounded-xl p-3">
          <span className="min-w-0 flex-1 text-sm">{c.title}</span>
          {PREV[c.status] ? (
            <button
              type="button"
              onClick={() => onMove(c.id, PREV[c.status]!)}
              aria-label="Voltar"
              className="press shrink-0 text-muted-foreground hover:text-foreground"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          {NEXT[c.status] ? (
            <button
              type="button"
              onClick={() => onMove(c.id, NEXT[c.status]!)}
              aria-label="Avançar"
              className="press shrink-0 text-primary hover:opacity-80"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(c.id)}
            aria-label="Excluir"
            className="press shrink-0 text-muted-foreground hover:text-status-broken"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Novo cartão"
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => {
            onAdd(title);
            setTitle('');
          }}
          aria-label="Adicionar cartão"
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard({
  userId,
  initial,
}: {
  userId: string;
  initial: KanbanCard[];
}) {
  const { cards, addCard, moveCard, deleteCard } = useKanban(userId, initial);
  const busy = addCard.isPending;

  return (
    <div className="flex flex-col gap-4">
      {KANBAN_STATUSES.map((col) => (
        <Column
          key={col.key}
          col={col}
          cards={cards.filter((c) => c.status === col.key)}
          onAdd={(title) => addCard.mutate({ title, status: col.key })}
          onMove={(id, status) => moveCard.mutate({ id, status })}
          onDelete={(id) => deleteCard.mutate(id)}
          busy={busy}
        />
      ))}
    </div>
  );
}
