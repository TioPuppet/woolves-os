import { ThiingsAsset } from '@/components/ThiingsAsset';
import { type ThiingsAssetKey } from '@/lib/thiings-registry';

/**
 * A module not yet available — an elegant "locked" tile. No internal milestone
 * codes in the UI; just a quiet "Em breve" in Titanium Silver.
 */
export function ModuleCard({
  assetKey,
  title,
}: {
  assetKey: ThiingsAssetKey;
  title: string;
}) {
  return (
    <div className="surface-1 flex flex-col gap-3 rounded-2xl p-4 opacity-70">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset assetKey={assetKey} size={26} className="opacity-70" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Em breve
      </span>
    </div>
  );
}
