'use client';

import { useEffect } from 'react';

/**
 * Registers the custom service worker (/public/sw.js) after mount.
 * Kept minimal: app-shell caching only. Mutations stay online-only.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {
          /* Registration is best-effort; app works without it. */
        });
    };

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
