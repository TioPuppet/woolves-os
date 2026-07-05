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
      <section className="rise rounded-2xl border bg-card p-5">
        <div className="mb-1 flex items-center gap-2.5">
          <ThiingsAsset assetKey="habits" size={26} />
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
        'press flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-5 text-left transition-colors',
        done
          ? 'border-primary/40 bg-primary/10'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition',
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
        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Hábito obrigatório
        </span>
        <span
          className={cn(
            'block truncate text-sm font-semibold',
            done && 'text-foreground',
          )}
        >
          {habit}
        </span>
      </span>
    </button>
  );
}
