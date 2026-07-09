'use client';

import { ThiingsAsset } from '@/components/ThiingsAsset';
import { DAY_STATUS_META, type DayStatus } from '@/lib/day-status';
import type { TodayCampaign } from '@/lib/today';

function moraleLabel(mood: number): string {
  if (mood >= 5) return 'Lendário';
  if (mood === 4) return 'Forte';
  if (mood === 3) return 'Estável';
  if (mood === 2) return 'Resistiu';
  return 'Ferido';
}

export function CheckinVictory({
  open,
  mood,
  dayConquered,
  status,
  streak,
  campaign,
  onClose,
}: {
  open: boolean;
  mood: number;
  dayConquered: boolean;
  status: DayStatus;
  streak: number;
  campaign: TodayCampaign;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fechar resultado"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <section className="victory-card anim-rise relative w-full max-w-app rounded-[2rem] border border-white/[0.08] p-6 text-center">
        <div className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-[2rem] bg-primary/[0.09] ring-1 ring-primary/25">
          <ThiingsAsset assetKey={dayConquered ? 'trophy' : 'award'} size={74} />
        </div>

        <p className="text-[11px] font-semibold uppercase text-muted-foreground">
          Dungeon concluída
        </p>
        <h2 className="mt-1 text-3xl font-semibold leading-tight">
          {dayConquered ? 'Território conquistado' : 'Dia registrado'}
        </h2>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <ResultTile label="Moral" value={moraleLabel(mood)} tone="gold" />
          <ResultTile label="Status" value={DAY_STATUS_META[status].label} />
          <ResultTile label="Streak" value={`${streak}d`} />
        </div>

        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-left">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Campanha
              </p>
              <p className="mt-1 text-sm font-semibold">
                {campaign.focusLabel} · {campaign.conqueredDays}/7
              </p>
            </div>
            <p className="shrink-0 text-lg font-bold text-primary tabular-nums">
              +{campaign.expWeek} EXP
            </p>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-[18rem] text-sm leading-6 text-muted-foreground">
          {dayConquered
            ? 'Missão, hábito e água entraram para o histórico. Amanhã a campanha abre novo território.'
            : 'Nem todo dia fecha perfeito. Registrar o campo mantém a campanha viva e mostra onde atacar amanhã.'}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="press mt-6 min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          Voltar ao Today
        </button>
      </section>
    </div>
  );
}

function ResultTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'gold';
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-2 py-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className={tone === 'gold' ? 'mt-1 text-sm font-bold text-primary' : 'mt-1 text-sm font-bold'}>
        {value}
      </p>
    </div>
  );
}
