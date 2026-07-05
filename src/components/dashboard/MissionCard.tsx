import { ThiingsAsset } from '@/components/ThiingsAsset';
import { StatusBadge } from './StatusBadge';
import { type DayStatus } from '@/lib/day-status';

/** The single daily mission, front and center (product core). */
export function MissionCard({
  mission,
  status,
  recovery = false,
}: {
  mission: string;
  status: DayStatus;
  recovery?: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ThiingsAsset assetKey="mission" size={22} />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {recovery ? 'Missão de recuperação' : 'Missão de hoje'}
          </h2>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="text-base leading-relaxed">{mission}</p>
    </section>
  );
}
