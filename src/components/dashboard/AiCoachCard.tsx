'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThiingsAsset } from '@/components/ThiingsAsset';

export function AiCoachCard() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'daily' }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setContent(typeof d.content === 'string' ? d.content : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-3xl border border-[hsl(var(--ia)/0.25)] bg-[hsl(var(--ia)/0.08)] p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ThiingsAsset assetKey="ai" size={36} />
          <h2 className="text-[11px] font-semibold uppercase text-[hsl(var(--ia))]">
            Woolves IA
          </h2>
        </div>
        <Link href="/relatorio" className="text-[11px] font-medium text-[hsl(var(--ia))]">
          Relatório semanal
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Analisando seu dia…</p>
      ) : (
        <p className="text-sm leading-relaxed">
          {content ?? 'Sem sugestão no momento.'}
        </p>
      )}
    </section>
  );
}
