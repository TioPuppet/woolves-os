'use client';

import { useState } from 'react';
import { THIINGS_REGISTRY, type ThiingsAssetKey } from '@/lib/thiings-registry';
import { cn } from '@/lib/utils';

/**
 * R1 — the ONLY sanctioned way to render an identity / gamification / module /
 * decorative visual. Renders /public/assets/thiings/{key}.png.
 *
 * Rendering strategy avoids the broken-image flash while assets are missing:
 * the neutral placeholder shows immediately; the PNG is loaded underneath and
 * only revealed once it successfully loads. A missing file simply keeps the
 * placeholder (no browser broken-image icon).
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
  const [loaded, setLoaded] = useState(false);

  const label = alt ?? entry.alt;
  const dimension = { width: size, height: size } as const;

  return (
    <span
      role="img"
      aria-label={label}
      style={dimension}
      className={cn('relative inline-block shrink-0 select-none', className)}
    >
      {/* Neutral placeholder — visible until (and unless) the PNG loads. */}
      {!loaded ? (
        <span
          title={`thiings: ${assetKey}`}
          style={dimension}
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-xl',
            'border border-dashed border-border bg-muted/60 text-muted-foreground',
            'text-[8px] font-medium uppercase tracking-wider',
          )}
        >
          {assetKey}
        </span>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.path}
        alt={label}
        width={size}
        height={size}
        style={{ ...dimension, opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        className="object-contain transition-opacity duration-200"
        draggable={false}
      />
    </span>
  );
}
