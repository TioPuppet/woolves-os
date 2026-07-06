'use client';

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
  { href: '/perfil', label: 'Perfil', icon: 'settings' },
];

/** Fixed premium bottom navigation. Hides on auth/onboarding routes. */
export function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN.includes(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-app">
      <div className="glass flex items-stretch justify-around border-t border-white/5 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2">
        {TABS.map((t) => {
          const active =
            t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'press flex flex-1 flex-col items-center gap-1 rounded-xl py-1',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <ThiingsAsset
                assetKey={t.icon}
                size={26}
                className={active ? '' : 'opacity-60'}
              />
              <span className="text-[10px] font-semibold tracking-wide">
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
