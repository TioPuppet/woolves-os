import { ThiingsAsset } from '@/components/ThiingsAsset';
import { type LevelInfo, levelAssetKey } from '@/lib/exp-config';

/** Top-of-dashboard identity block: greeting, level, EXP bar and streak. */
export function LevelHeader({
  name,
  level,
  streak,
}: {
  name: string;
  level: LevelInfo;
  streak: number;
}) {
  const pct = Math.round(level.progress * 100);

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Hoje
          </p>
          <h1 className="text-xl font-semibold">Olá, {name}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
          <ThiingsAsset assetKey="fire" size={18} />
          <span className="text-sm font-semibold">{streak}</span>
          <span className="text-xs text-muted-foreground">dias</span>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <ThiingsAsset assetKey={levelAssetKey(level.level)} size={40} alt={level.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="truncate text-sm font-semibold">
              Nível {level.level} · {level.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {level.intoLevel}
              {level.span === Infinity ? '' : ` / ${level.span}`} EXP
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
