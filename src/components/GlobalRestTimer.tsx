'use client';

import { useEffect, useState } from 'react';
import { getRest, adjustRest, clearRest, REST_EVENT, type RestState } from '@/lib/rest-timer';

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function feedback() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(180);
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.start();
    setTimeout(() => {
      o.stop();
      void ctx.close();
    }, 180);
  } catch {
    /* audio bloqueado */
  }
}

/** Barra de descanso global — visível em qualquer tela enquanto houver timer. */
export function GlobalRestTimer() {
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const sync = () => setRest(getRest());
    sync();
    window.addEventListener(REST_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => {
      window.removeEventListener(REST_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      clearInterval(t);
    };
  }, []);

  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : null;

  useEffect(() => {
    if (rest && left === 0) {
      feedback();
      clearRest();
      setRest(null);
    }
  }, [left, rest]);

  if (!rest || left == null || left <= 0) return null;
  const pct = rest.total > 0 ? Math.max(0, Math.min(100, (left / rest.total) * 100)) : 0;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+80px)] z-50 mx-auto w-full max-w-app px-5">
      <div className="glass flex items-center gap-3 rounded-2xl border border-primary/30 p-3 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]">
        <span className="text-sm font-semibold text-primary">Descanso</span>
        <span className="text-lg font-bold tabular-nums">{fmt(left)}</span>
        <div className="mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-card">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <button type="button" onClick={() => adjustRest(-15)} className="press rounded-lg bg-card px-2 py-1 text-xs font-semibold">−15</button>
        <button type="button" onClick={() => adjustRest(15)} className="press rounded-lg bg-card px-2 py-1 text-xs font-semibold">+15</button>
        <button type="button" onClick={() => clearRest()} className="press rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Pular</button>
      </div>
    </div>
  );
}
