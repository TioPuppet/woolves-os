'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ThiingsAsset } from '@/components/ThiingsAsset';

function renderMarkdown(md: string): ReactNode[] {
  return md.split('\n').map((line, i) => {
    const t = line.trim();
    if (t.startsWith('## '))
      return (
        <h3 key={i} className="mt-5 text-sm font-semibold text-[hsl(var(--ia))]">
          {t.slice(3)}
        </h3>
      );
    if (t.startsWith('# '))
      return (
        <h2 key={i} className="mt-5 text-lg font-bold">
          {t.slice(2)}
        </h2>
      );
    if (t.startsWith('- ') || t.startsWith('* '))
      return (
        <li key={i} className="ml-5 list-disc text-sm leading-relaxed text-muted-foreground">
          {t.slice(2)}
        </li>
      );
    if (t === '') return null;
    return (
      <p key={i} className="text-sm leading-relaxed text-muted-foreground">
        {t}
      </p>
    );
  });
}

export function WeeklyReportClient() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'weekly' }),
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
    <main className="flex min-h-screen flex-col gap-5 px-5 pb-28 pt-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="press text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="ai" size={30} />
          <h1 className="text-xl font-semibold">Relatório semanal</h1>
        </div>
      </header>

      <section className="surface-2 rounded-3xl p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            A Woolves IA está analisando sua semana…
          </p>
        ) : content ? (
          <div className="flex flex-col gap-1">{renderMarkdown(content)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Não foi possível gerar o relatório agora.
          </p>
        )}
      </section>
    </main>
  );
}
