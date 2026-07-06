'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSleep } from '@/hooks/useSleep';
import {
  SLEEP_GOAL_HOURS,
  QUALITY_LABELS,
  type SleepData,
} from '@/lib/sleep';
import { localDayString, shiftLocalDay } from '@/lib/date';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { CountUp } from '@/components/finance/CountUp';
import { cn } from '@/lib/utils';

const PURPLE = '252 96% 68%';
const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function Ring({
  fraction,
  size = 176,
  stroke = 14,
  children,
}: {
  fraction: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const len = Math.min(1, Math.max(0, fraction)) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="anim-pop -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(0 0% 100% / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`hsl(${PURPLE})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${len} ${circ - len}`}
          style={{ filter: `drop-shadow(0 0 6px hsl(${PURPLE} / 0.5))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

export function SleepClient({
  timezone,
  initial,
}: {
  timezone: string;
  initial: SleepData;
}) {
  const { sleep, logSleep, logWeight } = useSleep(timezone, initial);

  const [hours, setHours] = useState(sleep.today?.hours?.toString() ?? '');
  const [quality, setQuality] = useState<number | null>(
    sleep.today?.quality ?? null,
  );
  const [weight, setWeight] = useState('');

  const loggedHours = sleep.today?.hours ?? 0;
  const fraction = loggedHours / SLEEP_GOAL_HOURS;
  const met = loggedHours >= SLEEP_GOAL_HOURS;

  // Build 7-day map for the weekly bars.
  const today = localDayString(timezone);
  const days = Array.from({ length: 7 }, (_, i) => shiftLocalDay(today, i - 6));
  const byDate = new Map(sleep.week.map((w) => [w.ref_date, w.hours]));
  const maxH = Math.max(SLEEP_GOAL_HOURS, ...sleep.week.map((w) => w.hours), 1);

  const weightDelta =
    sleep.latestWeight != null && sleep.prevWeight != null
      ? Math.round((sleep.latestWeight - sleep.prevWeight) * 10) / 10
      : null;

  return (
    <div className="night min-h-screen">
      <main className="flex min-h-screen flex-col gap-6 px-5 pb-28 pt-10">
        <header className="flex items-center gap-3">
          <Link href="/" className="press text-muted-foreground hover:text-foreground" aria-label="Voltar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="flex items-center gap-2.5">
            <ThiingsAsset assetKey="sleep" size={30} />
            <h1 className="text-xl font-semibold">Sono</h1>
          </div>
        </header>

        {/* Hero ring */}
        <section className="flex flex-col items-center gap-4 py-2">
          <Ring fraction={fraction}>
            <span className="text-4xl font-bold tabular-nums">
              <CountUp
                value={loggedHours}
                format={(n) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1))}
              />
              <span className="text-xl font-semibold text-muted-foreground">h</span>
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              meta {SLEEP_GOAL_HOURS}h
            </span>
            {sleep.today?.quality ? (
              <span className="mt-1 rounded-full bg-[hsl(252_96%_68%_/_0.18)] px-2.5 py-0.5 text-[11px] font-medium text-[hsl(252_96%_78%)]">
                {QUALITY_LABELS[sleep.today.quality]}
              </span>
            ) : null}
          </Ring>
          <p className={cn('text-sm font-semibold', met ? 'text-status-ontrack' : 'text-muted-foreground')}>
            {loggedHours === 0
              ? 'Registre seu sono de hoje'
              : met
                ? 'Noite bem dormida'
                : 'Abaixo da meta de sono'}
          </p>
        </section>

        {/* Log form */}
        <section className="surface-2 flex flex-col gap-3 rounded-3xl p-5">
          <p className="text-sm font-medium">Quantas horas você dormiu?</p>
          <input
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Ex.: 7.5"
            className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          <p className="text-sm font-medium">Como foi a qualidade?</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={cn(
                  'press flex h-14 flex-col items-center justify-center rounded-xl border text-[10px] font-medium leading-tight',
                  quality === q
                    ? 'border-[hsl(252_96%_68%_/_0.6)] bg-[hsl(252_96%_68%_/_0.15)] text-[hsl(252_96%_80%)]'
                    : 'border-border text-muted-foreground',
                )}
              >
                <span className="text-base font-bold">{q}</span>
                {QUALITY_LABELS[q]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!(Number(hours) > 0) || logSleep.isPending}
            onClick={() => logSleep.mutate({ hours: Number(hours), quality })}
            className="press min-h-11 w-full cursor-pointer rounded-xl bg-[hsl(252_96%_68%)] text-sm font-semibold text-white disabled:opacity-50"
          >
            {logSleep.isPending ? 'Registrando…' : 'Registrar sono'}
          </button>
        </section>

        {/* Weekly history */}
        <section className="surface-2 flex flex-col gap-3 rounded-3xl p-5">
          <p className="text-sm font-medium">Últimos 7 dias</p>
          <div className="flex h-28 items-end justify-between gap-2">
            {days.map((d, i) => {
              const h = byDate.get(d) ?? 0;
              const pct = Math.round((h / maxH) * 100);
              const isToday = d === today;
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[18px] rounded-full transition-all duration-500"
                      style={{
                        height: `${Math.max(pct, h > 0 ? 8 : 3)}%`,
                        background: h > 0 ? `hsl(${PURPLE})` : 'hsl(0 0% 100% / 0.08)',
                      }}
                    />
                  </div>
                  <span className={cn('text-[10px]', isToday ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                    {WEEKDAY[new Date(d + 'T00:00:00').getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Weight */}
        <section className="surface-2 flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ThiingsAsset assetKey="weight" size={26} />
              <span className="text-sm font-medium">Peso</span>
            </div>
            {sleep.latestWeight != null ? (
              <span className="flex items-baseline gap-2">
                <span className="text-base font-semibold tabular-nums">
                  {sleep.latestWeight} kg
                </span>
                {weightDelta != null && weightDelta !== 0 ? (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      weightDelta < 0 ? 'text-status-ontrack' : 'text-status-atrisk',
                    )}
                  >
                    {weightDelta < 0 ? '▼' : '▲'} {Math.abs(weightDelta)}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Peso de hoje (kg)"
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <button
              type="button"
              disabled={!(Number(weight) > 0) || logWeight.isPending}
              onClick={() => {
                logWeight.mutate(Number(weight));
                setWeight('');
              }}
              className="press min-h-11 shrink-0 cursor-pointer rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
