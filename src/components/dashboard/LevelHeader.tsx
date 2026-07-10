import { ThiingsAsset } from '@/components/ThiingsAsset';
import { type LevelInfo, levelAssetKey } from '@/lib/exp-config';

/** Top-of-dashboard identity block: greeting, level, EXP bar and streak. */
export function LevelHeader({
  eyebrow,
  title,
  level,
  streak,
  avatarUrl,
}: {
  eyebrow: string;
  title: string;
  level: LevelInfo;
  streak: number;
  avatarUrl?: string | null;
}) {
  const pct = Math.round(level.progress * 100);

  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold leading-tight">
            {title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/5 bg-card px-3 py-2">
          <ThiingsAsset assetKey="fire" size={24} />
          <span className="text-sm font-semibold tabular-nums">{streak}</span>
          <span className="text-[11px] text-muted-foreground">dias</span>
        </div>
      </div>

      <div className="surface-2 flex items-center gap-4 rounded-3xl p-4">
        <div className="ring-gold relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-background/40">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <ThiingsAsset
              assetKey={levelAssetKey(level.level)}
              size={48}
              alt={level.title}
            />
          )}
          {avatarUrl ? (
            <span className="absolute bottom-0.5 right-0.5 grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-black/70 backdrop-blur">
              <ThiingsAsset
                assetKey={levelAssetKey(level.level)}
                size={20}
                alt={level.title}
              />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-base font-semibold">
              Nível {level.level} · {level.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {level.intoLevel}
              {level.span === Infinity ? '' : ` / ${level.span}`} EXP
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
