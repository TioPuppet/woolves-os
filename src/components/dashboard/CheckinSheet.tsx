'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const MOODS: { value: number; label: string }[] = [
  { value: 1, label: 'Muito mal' },
  { value: 2, label: 'Mal' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Bem' },
  { value: 5, label: 'Ótimo' },
];

export function CheckinSheet({
  open,
  onClose,
  defaultMissionDone,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  defaultMissionDone: boolean;
  onSubmit: (v: { mood: number; note: string; missionDone: boolean }) => void;
  pending: boolean;
}) {
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [missionDone, setMissionDone] = useState(defaultMissionDone);

  useEffect(() => {
    if (open) setMissionDone(defaultMissionDone);
  }, [defaultMissionDone, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="rise glass relative w-full max-w-app rounded-t-3xl border border-border p-6 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Check-in da noite</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="press cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className="mb-2 text-sm font-medium">Como foi seu dia?</p>
        <div className="mb-5 grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={cn(
                'press flex h-14 cursor-pointer flex-col items-center justify-center rounded-xl border text-[10px] font-medium leading-tight',
                mood === m.value
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted/40',
              )}
            >
              <span className="text-base font-bold">{m.value}</span>
              {m.label}
            </button>
          ))}
        </div>

        <label className="mb-5 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium">Cumpri a missão de hoje</span>
          <input
            type="checkbox"
            checked={missionDone}
            onChange={(e) => setMissionDone(e.target.checked)}
            className="h-5 w-5 accent-[hsl(var(--primary))]"
          />
        </label>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Uma nota sobre o dia (opcional)"
          rows={3}
          className="mb-5 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
        />

        <button
          type="button"
          disabled={mood === null || pending}
          onClick={() =>
            mood !== null && onSubmit({ mood, note, missionDone })
          }
          className="press min-h-12 w-full cursor-pointer rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Fechando o dia…' : 'Fechar o dia'}
        </button>
      </div>
    </div>
  );
}
