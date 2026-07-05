import { ThiingsAsset } from '@/components/ThiingsAsset';
import { type ThiingsAssetKey } from '@/lib/thiings-registry';

/**
 * Module tile on the dashboard. Every card shows one clear next action even
 * when empty (R5). Logging becomes interactive in M3+; for now the action is a
 * visual affordance labelled with what the user will do.
 */
export function ModuleCard({
  assetKey,
  title,
  value,
  action,
}: {
  assetKey: ThiingsAssetKey;
  title: string;
  /** Current value/summary, or null for the empty state. */
  value?: string | null;
  /** Next-action label (e.g. "Registrar água"). */
  action: string;
}) {
  const empty = value == null || value === '';

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <ThiingsAsset assetKey={assetKey} size={28} />
        <span className="text-sm font-medium">{title}</span>
      </div>

      <div>
        <p
          className={
            empty ? 'text-sm text-muted-foreground' : 'text-lg font-semibold'
          }
        >
          {empty ? '—' : value}
        </p>
        <p className="mt-1 text-xs font-medium text-primary">{action}</p>
      </div>
    </div>
  );
}
