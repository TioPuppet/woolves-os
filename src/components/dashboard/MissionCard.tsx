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
    <section className="hero-mission rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="target" size={24} />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {recovery ? 'Missão de recuperação' : 'Missão de hoje'}
          </h2>
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
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onToggleDone(!done)}
            aria-pressed={done}
            aria-label={done ? 'Desmarcar missão' : 'Concluir missão'}
            className={cn(
              'press mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition',
              done ? 'border-primary bg-primary' : 'border-muted-foreground/40',
            )}
          >
            {done && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 13l4 4L19 7" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <p
            className={cn(
              'min-w-0 flex-1 text-lg font-medium leading-snug',
              done && 'text-muted-foreground line-through',
            )}
          >
            {text}
          </p>
          <button type="button" onClick={startEdit} aria-label="Editar missão" className="press mt-1 shrink-0 text-muted-foreground hover:text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 20h4L18.5 9.5a2.12 2.12 0 00-3-3L5 17v3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
        <button type="button" onClick={startEdit} className="press flex w-full items-center justify-between gap-3 text-left">
          <span className="text-base font-medium text-muted-foreground">Defina a missão de hoje.</span>
          <span className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
            Definir
          </span>
        </button>
      )}
    </section>
  );
}
