'use client';

import { useEffect, useMemo, useState } from 'react';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import {
  FOCUS_PRESETS,
  fetchRecentFocusSessions,
  formatFocusMinutes,
  formatFocusTime,
  sumFocusSeconds,
  type FocusMode,
  type FocusSession,
} from '@/lib/focus';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'woolves-focus-session-v1';
const LONG_BREAK_MINUTES = 15;

type Phase = 'focus' | 'break';

interface TimerState {
  mode: FocusMode;
  phase: Phase;
  focusMinutes: number;
  breakMinutes: number;
  round: number;
  sessionStartedAt: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  noteId: number | null;
  cardId: number | null;
}

interface FocusTarget {
  id: number;
  title: string;
}

function loadTimer(): TimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as TimerState | null;
    if (!parsed || !parsed.startedAt || !parsed.sessionStartedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function elapsedSeconds(timer: TimerState, now: number): number {
  const pausedNow = timer.pausedAt ? now - timer.pausedAt : 0;
  return Math.max(0, Math.floor((now - timer.startedAt - timer.pausedTotalMs - pausedNow) / 1000));
}

function phaseDurationSeconds(timer: TimerState): number {
  return timer.phase === 'focus' ? timer.focusMinutes * 60 : timer.breakMinutes * 60;
}

function targetLabel(
  noteId: number | null,
  cardId: number | null,
  notes: FocusTarget[],
  cards: FocusTarget[],
): string {
  if (noteId) return notes.find((note) => note.id === noteId)?.title ?? 'Página';
  if (cardId) return cards.find((card) => card.id === cardId)?.title ?? 'Cartão';
  return 'Foco livre';
}

export function FocusPanel({
  userId,
  notes,
  cards,
}: {
  userId: string;
  notes: FocusTarget[];
  cards: FocusTarget[];
}) {
  const [timer, setTimer] = useState<TimerState | null>(() => loadTimer());
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [presetIndex, setPresetIndex] = useState(0);
  const [noteId, setNoteId] = useState<number | null>(null);
  const [cardId, setCardId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const preset = FOCUS_PRESETS[presetIndex] ?? FOCUS_PRESETS[0];

  const reloadSessions = async () => {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      setSessions(await fetchRecentFocusSessions(supabase, since));
    } catch {
      setNotice('O timer está pronto; o histórico aparecerá assim que o Espaço 2.0 estiver sincronizado.');
    }
  };

  useEffect(() => {
    void reloadSessions();
    // The user id scopes the page; Supabase remains the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (timer) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [timer]);

  useEffect(() => {
    if (!timer || timer.pausedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (!timer || timer.pausedAt || timer.mode !== 'pomodoro') return;
    if (elapsedSeconds(timer, now) < phaseDurationSeconds(timer)) return;

    if (timer.phase === 'focus') {
      const longBreak = timer.round >= 4;
      setTimer({
        ...timer,
        phase: 'break',
        breakMinutes: longBreak ? LONG_BREAK_MINUTES : timer.breakMinutes,
        startedAt: now,
        pausedAt: null,
        pausedTotalMs: 0,
      });
      setNotice(longBreak ? 'Quatro ciclos concluídos. Faça uma pausa longa.' : 'Ciclo concluído. A pausa também faz parte da estratégia.');
    } else {
      const nextRound = timer.round >= 4 ? 1 : timer.round + 1;
      setTimer({
        ...timer,
        phase: 'focus',
        round: nextRound,
        breakMinutes: timer.round >= 4 ? preset.breakMinutes : timer.breakMinutes,
        startedAt: now,
        pausedAt: null,
        pausedTotalMs: 0,
      });
      setNotice(nextRound === 1 ? 'Quatro ciclos concluídos. Novo bloco pronto.' : 'Pausa encerrada. Retome o comando.');
    }
  }, [now, timer]);

  const currentElapsed = timer ? elapsedSeconds(timer, now) : 0;
  const timerSeconds = timer
    ? timer.mode === 'stopwatch'
      ? currentElapsed
      : Math.max(0, phaseDurationSeconds(timer) - currentElapsed)
    : preset.focusMinutes * 60;
  const progress = timer && timer.mode === 'pomodoro'
    ? Math.min(100, (currentElapsed / phaseDurationSeconds(timer)) * 100)
    : 0;
  const focusSecondsToday = sessions
    .filter((session) => new Date(session.created_at).toDateString() === new Date().toDateString())
    .reduce((total, session) => total + session.focus_seconds, 0);
  const focusSecondsWeek = sumFocusSeconds(sessions);
  const cyclesWeek = sessions.reduce((total, session) => total + session.cycles, 0);

  const start = () => {
    setError(null);
    setNotice(null);
    const startedAt = Date.now();
    setNow(startedAt);
    setTimer({
      mode,
      phase: 'focus',
      focusMinutes: preset.focusMinutes,
      breakMinutes: preset.breakMinutes,
      round: 1,
      sessionStartedAt: startedAt,
      startedAt,
      pausedAt: null,
      pausedTotalMs: 0,
      noteId,
      cardId,
    });
  };

  const togglePause = () => {
    if (!timer) return;
    if (timer.pausedAt) {
      const resumedAt = Date.now();
      setTimer({
        ...timer,
        pausedAt: null,
        pausedTotalMs: timer.pausedTotalMs + resumedAt - timer.pausedAt,
      });
      setNotice(null);
    } else {
      setTimer({ ...timer, pausedAt: Date.now() });
      setNotice('Foco pausado. Retome quando estiver pronto.');
    }
  };

  const finish = async () => {
    if (!timer) return;
    setError(null);
    const focusSeconds = timer.mode === 'stopwatch'
      ? currentElapsed
      : Math.max(0, (timer.round - 1) * timer.focusMinutes * 60 + (timer.phase === 'break' ? timer.focusMinutes * 60 : currentElapsed));
    if (focusSeconds < 1) {
      setTimer(null);
      setNotice('Sessão descartada antes do primeiro minuto.');
      return;
    }
    const endedAt = new Date().toISOString();
    const { error: insertError } = await supabase.from('focus_sessions').insert({
      user_id: userId,
      note_id: timer.noteId,
      card_id: timer.cardId,
      mode: timer.mode,
      focus_seconds: focusSeconds,
      cycles: Math.max(1, timer.round),
      started_at: new Date(timer.sessionStartedAt).toISOString(),
      ended_at: endedAt,
    });
    if (insertError) {
      setTimer(null);
      setError('A sessão terminou, mas não foi possível salvar o histórico.');
      return;
    }
    setTimer(null);
    setNotice(`Sessão registrada: ${formatFocusMinutes(focusSeconds)} de presença.`);
    await reloadSessions();
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="workspace-focus overflow-hidden rounded-[1.75rem] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Câmara de foco</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">Uma coisa. Até o fim.</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Tempo protegido para o próximo movimento importante.</p>
          </div>
          <ThiingsAsset assetKey="ai" size={42} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-black/15 p-1">
          {(['pomodoro', 'stopwatch'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => !timer && setMode(value)}
              disabled={Boolean(timer)}
              className={cn(
                'press min-h-11 rounded-xl text-sm font-semibold transition-colors',
                mode === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                timer && 'cursor-not-allowed opacity-60',
              )}
            >
              {value === 'pomodoro' ? 'Pomodoro' : 'Cronômetro'}
            </button>
          ))}
        </div>

        {!timer && mode === 'pomodoro' && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {FOCUS_PRESETS.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setPresetIndex(index)}
                className={cn(
                  'press min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold',
                  presetIndex === index ? 'border-primary/50 bg-primary/12 text-primary' : 'border-border text-muted-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {timer ? (timer.phase === 'focus' ? 'Foco ativo' : 'Pausa') : mode === 'pomodoro' ? 'Pronto para começar' : 'Tempo livre'}
          </p>
          <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl">
            {formatFocusTime(timerSeconds)}
          </p>
          {timer?.mode === 'pomodoro' && (
            <div className="mt-4 w-full max-w-sm">
              <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Ciclo {timer.round} de 4</p>
            </div>
          )}
        </div>

        {!timer && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <label className="flex min-h-11 items-center rounded-xl border border-border bg-black/10 px-3">
              <span className="mr-2 text-xs text-muted-foreground">Página</span>
              <select value={noteId ?? ''} onChange={(event) => { setNoteId(event.target.value ? Number(event.target.value) : null); setCardId(null); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none">
                <option value="">Foco livre</option>
                {notes.map((note) => <option key={note.id} value={note.id}>{note.title}</option>)}
              </select>
            </label>
            <label className="flex min-h-11 items-center rounded-xl border border-border bg-black/10 px-3">
              <span className="mr-2 text-xs text-muted-foreground">Cartão</span>
              <select value={cardId ?? ''} onChange={(event) => { setCardId(event.target.value ? Number(event.target.value) : null); setNoteId(null); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none">
                <option value="">Nenhum</option>
                {cards.map((card) => <option key={card.id} value={card.id}>{card.title}</option>)}
              </select>
            </label>
          </div>
        )}

        {timer && <p className="mt-4 text-center text-sm text-muted-foreground">{targetLabel(timer.noteId, timer.cardId, notes, cards)}</p>}

        <div className="mt-5 flex gap-2">
          {!timer ? (
            <button type="button" onClick={start} className="press flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">Iniciar foco</button>
          ) : (
            <>
              <button type="button" onClick={togglePause} className="press min-h-12 flex-1 rounded-xl border border-border text-sm font-semibold">{timer.pausedAt ? 'Retomar' : 'Pausar'}</button>
              <button type="button" onClick={() => void finish()} className="press min-h-12 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">Encerrar e salvar</button>
            </>
          )}
        </div>
        {notice && <p className="mt-3 text-center text-xs text-primary" aria-live="polite">{notice}</p>}
        {error && <p className="mt-3 text-center text-xs text-status-broken" role="alert">{error}</p>}
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          ['Hoje', formatFocusMinutes(focusSecondsToday)],
          ['7 dias', formatFocusMinutes(focusSecondsWeek)],
          ['Ciclos', String(cyclesWeek)],
        ].map(([label, value]) => (
          <div key={label} className="surface-2 rounded-2xl p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {sessions.length > 0 && (
        <section className="surface-2 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rastro de foco</p>
              <h3 className="mt-1 text-lg font-semibold">Últimas sessões</h3>
            </div>
            <ThiingsAsset assetKey="journal" size={28} />
          </div>
          <div className="mt-3 flex flex-col divide-y divide-border">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{targetLabel(session.note_id, session.card_id, notes, cards)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(session.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-primary">{formatFocusMinutes(session.focus_seconds)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
