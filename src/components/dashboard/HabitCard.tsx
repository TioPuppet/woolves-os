'use client';

import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

/** Required-habit toggle (single tap). Done state is optimistic. */
export function HabitCard({
  habit,
  done,
  onToggle,
  pending,
}: {
  habit: string | null;
  done: boolean;
  onToggle: (done: boolean) => void;
  pending: boolean;
}) {
  if (!habit) {
    return (
      <section className="fitness-tile rise rounded-[1.5rem] p-5">
        <div className="mb-1 flex items-center gap-3">
          <ThiingsAsset assetKey="habits" size={36} />
          <h2 className="text-sm font-semibold">Hábito obrigatório</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Defina seu hábito nas configurações.
        </p>
      </section>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onToggle(!done)}
      aria-pressed={done}
      className={cn(
        'press fitness-tile flex w-full cursor-pointer items-center gap-4 rounded-[1.5rem] p-5 text-left transition-colors',
        done && 'border-primary/30 bg-primary/[0.08]',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 transition',
          done ? 'border-primary bg-primary' : 'border-muted-foreground/40',
        )}
      >
        {done ? (
          // Functional glyph (checkmark) — allowed by R1 for non-identity UI.
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 13l4 4L19 7"
              stroke="hsl(var(--primary-foreground))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium uppercase text-muted-foreground">
          Hábito obrigatório
        </span>
        <span
          className={cn(
            'block truncate text-base font-semibold',
            done && 'text-foreground',
          )}
        >
          {habit}
        </span>
      </span>
    </button>
  );
}
