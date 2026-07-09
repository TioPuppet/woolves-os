'use client';

import { ThiingsAsset } from '@/components/ThiingsAsset';
import { DAY_STATUS_META } from '@/lib/day-status';
import type { TodayCampaign, TodayCampaignDay } from '@/lib/today';
import { cn } from '@/lib/utils';

export function WeeklyCampaign({ campaign }: { campaign: TodayCampaign }) {
  const progress = Math.round((campaign.conqueredDays / 7) * 100);

  return (
    <section className="weekly-campaign rounded-[1.75rem] border border-white/[0.08] p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] ring-1 ring-primary/20">
          <ThiingsAsset assetKey="pack" size={52} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Campanha semanal
          </p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h2 className="text-2xl font-semibold leading-tight">
              {campaign.focusLabel}
            </h2>
            <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {campaign.days.map((day) => (
          <CampaignDay key={day.date} day={day} />
        ))}
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <CampaignMetric
          label="Territórios"
          value={`${campaign.conqueredDays}/7`}
        />
        <CampaignMetric label="EXP" value={`+${campaign.expWeek}`} />
        <CampaignMetric label="Melhor run" value={`${campaign.bestChain}d`} />
      </div>
    </section>
  );
}

function CampaignDay({ day }: { day: TodayCampaignDay }) {
  const statusLabel = day.status ? DAY_STATUS_META[day.status].label : 'Aberto';
  const waterPct =
    day.waterGoalMl && day.waterGoalMl > 0
      ? Math.min(100, Math.round((day.waterMl / day.waterGoalMl) * 100))
      : day.waterMl > 0
        ? 100
        : 0;

  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-[10px] font-semibold uppercase text-muted-foreground">
        {day.weekday}
      </p>
      <div
        title={`${statusLabel} · Água ${waterPct}%`}
        className={cn(
          'mt-2 grid aspect-square place-items-center rounded-2xl border transition',
          day.conquered
            ? 'border-primary/45 bg-primary/[0.18]'
            : day.closed
              ? 'border-white/[0.12] bg-white/[0.06]'
              : 'border-white/[0.07] bg-white/[0.025]',
        )}
      >
        {day.conquered ? (
          <ThiingsAsset assetKey="trophy" size={30} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                day.missionDone ? 'bg-status-broken' : 'bg-white/[0.18]',
              )}
            />
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                day.habitDone ? 'bg-status-ontrack' : 'bg-white/[0.18]',
              )}
            />
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                waterPct >= 100 ? 'bg-status-recovery' : 'bg-white/[0.18]',
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
