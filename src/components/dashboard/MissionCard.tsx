'use client';

import { useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { StatusBadge } from './StatusBadge';
import { type DayStatus } from '@/lib/day-status';
import { cn } from '@/lib/utils';

/** The single daily mission — editable, changes every day (product core). */
export function MissionCard({
  text,
  suggestion,
  done,
  status,
  onSave,
  onToggleDone,
  recovery = false,
}: {
  text: string | null;
  suggestion: string;
  done: boolean;
  status: DayStatus;
  onSave: (text: string) => void;
  onToggleDone: (done: boolean) => void;
  recovery?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(text ?? suggestion);
    setEditing(true);
  };
  const save = () => {
    onSave(draft.trim());
    setEditing(false);
  };

  return (
    <section className={cn('fitness-tile rounded-[1.5rem] p-5', done && 'quest-complete')}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] ring-1 ring-primary/20">
            <ThiingsAsset assetKey={done ? 'trophy' : 'target'} size={36} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[11px] font-semibold uppercase text-muted-foreground">
              {recovery ? 'Quest de recuperação' : 'Quest principal'}
            </h2>
            <p className="mt-1 truncate text-sm font-semibold">
              {done ? 'Recompensa liberada' : 'EXP do dia em jogo'}
            </p>
          </div>
        </div>
        {text ? <StatusBadge status={status} /> : null}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Qual é a missão de hoje?"
            className="w-full resize-none rounded-xl border border-border bg-card/60 p-3 text-base leading-snug focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditing(false)} className="press text-sm font-medium text-muted-foreground">
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              className="press rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : text ? (
        <div className="flex flex-col gap-4">
          <p
            className={cn(
              'text-xl font-semibold leading-snug',
              done && 'text-muted-foreground line-through',
            )}
          >
            {text}
          </p>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggleDone(!done)}
            aria-pressed={done}
            aria-label={done ? 'Reabrir missão' : 'Concluir missão'}
            className={cn(
              'press min-h-11 flex-1 rounded-2xl text-sm font-semibold transition',
              done
                ? 'bg-status-completed/15 text-status-completed ring-1 ring-status-completed/25'
                : 'bg-primary text-primary-foreground',
            )}
          >
            {done ? 'Reabrir quest' : '+120 EXP · Concluir'}
          </button>
          <button type="button" onClick={startEdit} aria-label="Editar missão" className="press grid min-h-11 w-12 shrink-0 place-items-center rounded-2xl border border-white/[0.08] text-muted-foreground hover:text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 20h4L18.5 9.5a2.12 2.12 0 00-3-3L5 17v3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startEdit} className="press flex w-full items-center justify-between gap-3 text-left">
          <span>
            <span className="block text-lg font-semibold">Defina sua quest.</span>
            <span className="mt-1 block text-sm text-muted-foreground">Uma missão clara para ganhar o dia.</span>
          </span>
          <span className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            Criar
          </span>
        </button>
      )}
    </section>
  );
}
