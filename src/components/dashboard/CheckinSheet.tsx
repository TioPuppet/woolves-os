'use client';

import { useEffect, useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

const MOODS: { value: number; label: string; title: string; reward: string }[] = [
  { value: 1, label: 'Ferido', title: 'Sobreviveu', reward: '+10 EXP' },
  { value: 2, label: 'Baixo', title: 'Resistiu', reward: '+25 EXP' },
  { value: 3, label: 'Estável', title: 'Manteve', reward: '+50 EXP' },
  { value: 4, label: 'Forte', title: 'Avançou', reward: '+80 EXP' },
  { value: 5, label: 'Lendário', title: 'Dominou', reward: '+120 EXP' },
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
  const selectedMood = MOODS.find((m) => m.value === mood);

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

      <div className="dungeon-sheet rise relative max-h-[92vh] w-full max-w-app overflow-y-auto rounded-t-[2rem] border border-white/[0.08] p-5 sm:rounded-[2rem]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] ring-1 ring-primary/20">
              <ThiingsAsset assetKey={missionDone ? 'trophy' : 'journal'} size={42} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Resultado da dungeon
              </p>
              <h2 className="mt-1 text-xl font-semibold leading-tight">
                Fechamento do dia
              </h2>
            </div>
          </div>
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

        <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Recompensa prevista
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold">
                {selectedMood?.reward ?? '+? EXP'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {missionDone ? 'Quest principal concluída.' : 'Quest principal pendente.'}
              </p>
            </div>
            <ThiingsAsset assetKey={missionDone ? 'award' : 'life_exp'} size={48} />
          </div>
        </div>

        <p className="mb-2 text-sm font-medium">Como saiu da dungeon?</p>
        <div className="mb-5 grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              className={cn(
                'press min-h-[5.25rem] cursor-pointer rounded-2xl border px-1.5 py-2 text-center transition',
                mood === m.value
                  ? 'border-primary/40 bg-primary/15 text-foreground'
                  : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]',
              )}
            >
              <span className="block text-lg font-bold">{m.value}</span>
              <span className="mt-0.5 block text-[10px] font-semibold leading-tight">
                {m.label}
              </span>
              <span className="mt-1 block text-[9px] leading-tight text-muted-foreground">
                {m.title}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMissionDone(!missionDone)}
          aria-pressed={missionDone}
          className={cn(
            'press mb-5 flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition',
            missionDone
              ? 'border-status-completed/30 bg-status-completed/10'
              : 'border-white/[0.08] bg-white/[0.03]',
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <ThiingsAsset assetKey={missionDone ? 'trophy' : 'target'} size={38} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                Quest principal
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {missionDone ? 'Concluída com honra.' : 'Ainda não foi concluída.'}
              </span>
            </span>
          </span>
          <span
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2',
              missionDone ? 'border-primary bg-primary' : 'border-muted-foreground/40',
            )}
          >
            {missionDone ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 13l4 4L19 7" stroke="hsl(var(--primary-foreground))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>
        </button>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Registro da campanha (opcional)"
          rows={3}
          className="mb-5 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        <button
          type="button"
          disabled={mood === null || pending}
          onClick={() =>
            mood !== null && onSubmit({ mood, note, missionDone })
          }
          className="press min-h-12 w-full cursor-pointer rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Calculando resultado…' : 'Concluir dungeon'}
        </button>
      </div>
    </div>
  );
}
