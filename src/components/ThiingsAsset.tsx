'use client';

import { useState } from 'react';
import { THIINGS_REGISTRY, type ThiingsAssetKey } from '@/lib/thiings-registry';
import { cn } from '@/lib/utils';

/**
 * R1 — the ONLY sanctioned way to render an identity / gamification / module /
 * decorative visual. Renders /public/assets/thiings/{key}.png.
 *
 * If the PNG is missing (owner hasn't downloaded it yet), it renders a neutral
 * placeholder with reserved dimensions, the asset key label, and the alt text —
 * so layouts don't shift once real assets are dropped in.
 *
 * Do NOT replace the placeholder with a custom illustration or icon library.
 */
export interface ThiingsAssetProps {
  assetKey: ThiingsAssetKey;
  /** Rendered square size in px. Reserved even while the file is missing. */
  size?: number;
  /** Overrides the registry default alt text. */
  alt?: string;
  className?: string;
}

export function ThiingsAsset({
  assetKey,
  size = 48,
  alt,
  className,
}: ThiingsAssetProps) {
  const entry = THIINGS_REGISTRY[assetKey];
  const [missing, setMissing] = useState(false);

  const label = alt ?? entry.alt;
  const dimension = { width: size, height: size } as const;

  if (missing) {
    return (
      <span
        role="img"
        aria-label={label}
        title={`thiings: ${assetKey}`}
        style={dimension}
        className={cn(
          'inline-flex items-center justify-center rounded-md',
          'border border-dashed border-border bg-muted text-muted-foreground',
          'text-[9px] font-medium uppercase tracking-wide',
          'overflow-hidden text-center leading-tight',
          className,
        )}
      >
        {assetKey}
      </span>
    );
  }

  return (
    // Plain <img> (not next/image) keeps the missing-file fallback simple and
    // avoids remote-loader config. Assets are local, small, and static.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={entry.path}
      alt={label}
      width={size}
      height={size}
      style={dimension}
      onError={() => setMissing(true)}
      className={cn('inline-block select-none object-contain', className)}
      draggable={false}
    />
  );
}
