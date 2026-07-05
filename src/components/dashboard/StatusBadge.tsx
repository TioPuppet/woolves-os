import { type DayStatus, DAY_STATUS_META } from '@/lib/day-status';
import { cn } from '@/lib/utils';

// Static class map so Tailwind keeps these in the build (no dynamic class names).
const STYLES: Record<DayStatus, string> = {
  on_track: 'text-status-ontrack border-status-ontrack/30 bg-status-ontrack/10',
  at_risk: 'text-status-atrisk border-status-atrisk/30 bg-status-atrisk/10',
  broken: 'text-status-broken border-status-broken/30 bg-status-broken/10',
  recovery: 'text-status-recovery border-status-recovery/30 bg-status-recovery/10',
  completed:
    'text-status-completed border-status-completed/30 bg-status-completed/10',
};

const DOTS: Record<DayStatus, string> = {
  on_track: 'bg-status-ontrack',
  at_risk: 'bg-status-atrisk',
  broken: 'bg-status-broken',
  recovery: 'bg-status-recovery',
  completed: 'bg-status-completed',
};

export function StatusBadge({ status }: { status: DayStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-xs font-semibold',
        STYLES[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[status])} />
      {DAY_STATUS_META[status].label}
    </span>
  );
}
