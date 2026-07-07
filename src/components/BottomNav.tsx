'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { type ThiingsAssetKey } from '@/lib/thiings-registry';
import { cn } from '@/lib/utils';

const HIDDEN = ['/login', '/signup', '/onboarding'];

const TABS: { href: string; label: string; icon: ThiingsAssetKey }[] = [
  { href: '/', label: 'Hoje', icon: 'today' },
  { href: '/treino', label: 'Treino', icon: 'calories' },
  { href: '/financas', label: 'Finanças', icon: 'finances' },
  { href: '/sono', label: 'Sono', icon: 'sleep' },
];

// Everything accessible from the Woolves IA hub.
const HUB: { href: string; label: string; icon: ThiingsAssetKey }[] = [
  { href: '/relatorio', label: 'Relatório', icon: 'ai' },
  { href: '/', label: 'Hoje', icon: 'today' },
  { href: '/treino', label: 'Treino', icon: 'calories' },
  { href: '/financas', label: 'Finanças', icon: 'finances' },
  { href: '/sono', label: 'Sono', icon: 'sleep' },
  { href: '/notas', label: 'Espaço', icon: 'journal' },
  { href: '/perfil', label: 'Perfil', icon: 'settings' },
];

function Tab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ThiingsAssetKey;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'press flex flex-1 flex-col items-center gap-1 py-1',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <ThiingsAsset assetKey={icon} size={24} className={active ? '' : 'opacity-60'} />
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [hubOpen, setHubOpen] = useState(false);
  if (HIDDEN.includes(pathname)) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {hubOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setHubOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <div className="relative w-full max-w-app px-5 pb-32">
            <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-[hsl(var(--ia))]">
              Woolves IA
            </p>
            <div className="grid grid-cols-3 gap-3">
              {HUB.map((item, i) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setHubOpen(false)}
                  style={{ animationDelay: `${i * 45}ms` }}
                  className="anim-pop surface-2 flex flex-col items-center gap-2 rounded-2xl p-4"
                >
                  <ThiingsAsset assetKey={item.icon} size={36} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-app">
        <div className="glass flex items-end justify-around border-t border-white/5 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2">
          <Tab {...TABS[0]!} active={isActive(TABS[0]!.href)} />
          <Tab {...TABS[1]!} active={isActive(TABS[1]!.href)} />

          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => setHubOpen((v) => !v)}
              aria-label="Woolves IA"
              className={cn(
                'press -mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-full',
                'border border-[hsl(var(--ia)/0.5)] bg-[hsl(var(--ia)/0.18)] backdrop-blur',
                'shadow-[0_10px_30px_-8px_hsl(var(--ia)/0.6)]',
              )}
            >
              <ThiingsAsset assetKey="ai" size={34} />
            </button>
          </div>

          <Tab {...TABS[2]!} active={isActive(TABS[2]!.href)} />
          <Tab {...TABS[3]!} active={isActive(TABS[3]!.href)} />
        </div>
      </nav>
    </>
  );
}
