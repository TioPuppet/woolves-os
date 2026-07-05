import { ThiingsAsset } from '@/components/ThiingsAsset';
import { StatusBadge } from './StatusBadge';
import { type DayStatus } from '@/lib/day-status';

/** The single daily mission — the hero of the dashboard (product core). */
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
    <section className="hero-mission rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="target" size={24} />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {recovery ? 'Missão de recuperação' : 'Missão de hoje'}
          </h2>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="text-lg font-medium leading-snug">{mission}</p>
    </section>
  );
}
