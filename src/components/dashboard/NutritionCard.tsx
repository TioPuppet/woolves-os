'use client';

import { ThiingsAsset } from '@/components/ThiingsAsset';

function Bar({
  label,
  current,
  goal,
  unit,
}: {
  label: string;
  current: number;
  goal: number | null;
  unit: string;
}) {
  const pct = goal ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const reached = goal != null && current >= goal;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span>
          <span className={reached ? 'font-semibold text-primary' : 'font-semibold'}>
            {current}
          </span>
          {goal ? ` / ${goal}${unit}` : ` ${unit}`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Nutrition summary + entry point to log a meal (M4). */
export function NutritionCard({
  kcalToday,
  proteinToday,
  goalKcal,
  goalProteinG,
  onOpen,
}: {
  kcalToday: number;
  proteinToday: number;
  goalKcal: number | null;
  goalProteinG: number | null;
  onOpen: () => void;
}) {
  return (
    <section className="surface-2 rise flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="alimentacao" size={26} />
          <h2 className="text-sm font-semibold">Nutrição</h2>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="press cursor-pointer text-xs font-semibold text-primary"
        >
          + Registrar refeição
        </button>
      </div>

      <Bar label="Calorias" current={kcalToday} goal={goalKcal} unit=" kcal" />
      <Bar label="Proteína" current={proteinToday} goal={goalProteinG} unit="g" />
    </section>
  );
}
