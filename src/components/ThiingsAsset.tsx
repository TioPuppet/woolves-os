'use client';

import { useState } from 'react';
import { THIINGS_REGISTRY, type ThiingsAssetKey } from '@/lib/thiings-registry';
import { cn } from '@/lib/utils';

/**
 * R1 — the ONLY sanctioned way to render an identity / gamification / module /
 * decorative visual. Renders /public/assets/thiings/{key}.png.
 *
 * The PNG is rendered directly so it appears as soon as the browser has it
 * (works with SSR — no onLoad race). If the file is genuinely missing, onError
 * swaps to a neutral, fully-contained placeholder (reserved dimensions, no
 * overflowing text) so layouts never break.
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
          'inline-flex shrink-0 items-center justify-center overflow-hidden',
          'rounded-lg border border-dashed border-border bg-muted',
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={entry.path}
      alt={label}
      width={size}
      height={size}
      style={dimension}
      onError={() => setMissing(true)}
      draggable={false}
      className={cn(
        'inline-block shrink-0 select-none object-contain',
        className,
      )}
    />
  );
}
