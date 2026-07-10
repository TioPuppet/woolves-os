'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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
const QUICK_HOURS = [6, 6.5, 7, 7.5, 8];
const WIND_DOWN = [
  { title: 'Luz baixa', body: 'Reduza brilho e ruído antes do sono.' },
  { title: 'Último plano', body: 'Defina amanhã antes de deitar.' },
  { title: 'Tela longe', body: 'Deixe o celular fora da cama.' },
];

/** Eases a value toward its target with requestAnimationFrame (survives
 *  prefers-reduced-motion, since it's JS not a CSS transition). */
function useAnimated(target: number, duration = 850): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const startVal = from.current;
    if (startVal === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(startVal + (target - startVal) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

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
  const animFraction = useAnimated(Math.min(1, Math.max(0, fraction)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const len = animFraction * circ;
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

function formatHours(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function parseClock(value: string): number | null {
  const parts = value.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function sleepWindowHours(bedTime: string, wakeTime: string): number | null {
  const bed = parseClock(bedTime);
  const wake = parseClock(wakeTime);
  if (bed == null || wake == null) return null;
  const minutes = wake > bed ? wake - bed : wake + 24 * 60 - bed;
  if (minutes <= 0 || minutes > 24 * 60) return null;
  return Math.round((minutes / 60) * 10) / 10;
}

function displayClock(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function sleepVerdict(hours: number): { title: string; body: string } {
  if (hours <= 0) {
    return {
      title: 'Feche o portão da noite',
      body: 'Registre o descanso para saber se amanhã começa com lâmina afiada ou escudo pesado.',
    };
  }
  if (hours >= SLEEP_GOAL_HOURS + 1) {
    return {
      title: 'Recuperação de elite',
      body: 'O corpo entrou em reparo profundo. Amanhã, use essa vantagem com estratégia.',
    };
  }
  if (hours >= SLEEP_GOAL_HOURS) {
    return {
      title: 'Noite bem defendida',
      body: 'Você protegeu a base. Energia não é sorte; é logística.',
    };
  }
  return {
    title: 'Sono abaixo da muralha',
    body: 'Não negocie recuperação por vaidade. Um lobo cansado erra a caça.',
  };
}

function sleepScore(hours: number, quality: number | null, weekMet: number): number {
  const durationScore = Math.min(1, hours / SLEEP_GOAL_HOURS) * 62;
  const qualityScore = ((quality ?? 3) / 5) * 24;
  const consistencyScore = Math.min(1, weekMet / 5) * 14;
  return Math.round(Math.min(100, durationScore + qualityScore + consistencyScore));
}

function readiness(score: number): string {
  if (score >= 86) return 'Alta';
  if (score >= 70) return 'Boa';
  if (score >= 55) return 'Vigiada';
  return 'Baixa';
}

export function SleepClient({
  userId,
  timezone,
  initial,
}: {
  userId: string;
  timezone: string;
  initial: SleepData;
}) {
  const { sleep, logSleep } = useSleep(userId, timezone, initial);

  const [hours, setHours] = useState(sleep.today?.hours?.toString() ?? '');
  const [bedTime, setBedTime] = useState(displayClock(sleep.today?.bed_time ?? null) ?? '');
  const [wakeTime, setWakeTime] = useState(displayClock(sleep.today?.wake_time ?? null) ?? '');
  const [quality, setQuality] = useState<number | null>(
    sleep.today?.quality ?? null,
  );

  useEffect(() => {
    if (!sleep.today) return;
    setHours(String(sleep.today.hours));
    setBedTime(displayClock(sleep.today.bed_time) ?? '');
    setWakeTime(displayClock(sleep.today.wake_time) ?? '');
    setQuality(sleep.today.quality);
  }, [sleep.today]);

  useEffect(() => {
    const calculated = sleepWindowHours(bedTime, wakeTime);
    if (calculated != null) setHours(String(calculated));
  }, [bedTime, wakeTime]);

  const loggedHours = sleep.today?.hours ?? 0;

  // Build 7-day map for the weekly bars.
  const today = localDayString(timezone);
  const days = Array.from({ length: 7 }, (_, i) => shiftLocalDay(today, i - 6));
  const byDate = new Map(sleep.week.map((w) => [w.ref_date, w.hours]));
  const maxH = Math.max(SLEEP_GOAL_HOURS, ...sleep.week.map((w) => w.hours), 1);
  const weekTotal = sleep.week.reduce((sum, entry) => sum + entry.hours, 0);
  const weekAverage = sleep.week.length ? weekTotal / sleep.week.length : 0;
  const weekMet = sleep.week.filter((entry) => entry.hours >= SLEEP_GOAL_HOURS).length;
  const debt = Math.max(0, (SLEEP_GOAL_HOURS * 7) - weekTotal);
  const score = sleepScore(loggedHours, sleep.today?.quality ?? quality, weekMet);
  const verdict = sleepVerdict(loggedHours);

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

        <section className="sleep-command rounded-[2rem] border border-white/[0.08] p-5">
          <div className="flex items-center gap-4">
            <Ring fraction={score / 100} size={136} stroke={12}>
              <span className="text-3xl font-bold tabular-nums">
                <CountUp value={score} format={(n) => n.toFixed(0)} />
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">
                score do sono
              </span>
              <span className="mt-0.5 text-[11px] font-semibold text-[hsl(252_96%_78%)]">
                {formatHours(loggedHours)}h
              </span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Recuperação
              </p>
              <h2 className="mt-1 text-xl font-semibold leading-tight">
                {verdict.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {verdict.body}
              </p>
              {sleep.today?.quality ? (
                <span className="mt-3 inline-flex rounded-full bg-[hsl(252_96%_68%_/_0.16)] px-3 py-1 text-[11px] font-semibold text-[hsl(252_96%_78%)]">
                  Qualidade: {QUALITY_LABELS[sleep.today.quality]}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <SleepMetric label="Prontidão" value={readiness(score)} compact />
            <SleepMetric label="Débito" value={`${formatHours(debt)}h`} compact />
            <SleepMetric label="Meta" value={`${SLEEP_GOAL_HOURS}h`} compact />
          </div>
        </section>

        <section className="surface-2 flex flex-col gap-4 rounded-3xl p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Check-out noturno
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Quanto descanso voltou para o corpo?
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                Dormiu
              </span>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                Acordou
              </span>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </label>
          </div>
          <input
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Horas dormidas"
            className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          <div className="grid grid-cols-5 gap-2">
            {QUICK_HOURS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setHours(String(value))}
                className={cn(
                  'press min-h-9 rounded-xl border text-xs font-semibold transition',
                  Number(hours) === value
                    ? 'border-[hsl(252_96%_68%_/_0.6)] bg-[hsl(252_96%_68%_/_0.15)] text-[hsl(252_96%_80%)]'
                    : 'border-border text-muted-foreground',
                )}
              >
                {formatHours(value)}h
              </button>
            ))}
          </div>
          <p className="text-sm font-medium">Qualidade da noite</p>
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
            onClick={() =>
              logSleep.mutate({
                hours: Number(hours),
                quality,
                bedTime: bedTime || null,
                wakeTime: wakeTime || null,
              })
            }
            className="press min-h-11 w-full cursor-pointer rounded-xl bg-[hsl(252_96%_68%)] text-sm font-semibold text-white disabled:opacity-50"
          >
            {logSleep.isPending ? 'Registrando…' : 'Registrar sono'}
          </button>
        </section>

        <section className="surface-2 flex flex-col gap-4 rounded-3xl p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Ritual de desaceleração
            </p>
            <h2 className="mt-1 text-lg font-semibold">Prepare a próxima noite</h2>
          </div>
          <div className="grid gap-2">
            {WIND_DOWN.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-2 flex flex-col gap-4 rounded-3xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Patrulha de 7 dias
              </p>
              <h2 className="mt-1 text-lg font-semibold">Ritmo de recuperação</h2>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums">{formatHours(weekAverage)}h</p>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                média
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SleepMetric label="Noites na meta" value={`${weekMet}/7`} />
            <SleepMetric label="Débito semanal" value={`${formatHours(debt)}h`} />
          </div>
          <div className="flex h-28 items-end justify-between gap-2">
            {days.map((d) => {
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

      </main>
    </div>
  );
}

function SleepMetric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-1 font-bold tabular-nums', compact ? 'text-base' : 'text-lg')}>
        {value}
      </p>
    </div>
  );
}
