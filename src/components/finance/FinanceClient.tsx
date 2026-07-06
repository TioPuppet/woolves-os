'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useFinance } from '@/hooks/useFinance';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryMeta,
  categoryColor,
  type FinanceToday,
} from '@/lib/finance';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';
import { CountUp } from './CountUp';
import { Donut } from './Donut';

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FinanceClient({
  timezone,
  limit,
  initial,
}: {
  timezone: string;
  limit: number | null;
  initial: FinanceToday;
}) {
  const { finance, logTransaction, deleteTransaction } = useFinance(
    timezone,
    limit,
    initial,
  );

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('alimentacao');
  const [note, setNote] = useState('');

  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const spent = finance.spent;
  const lim = finance.limit;
  const balance = finance.income - spent;
  const pct = lim ? Math.min(100, Math.round((spent / lim) * 100)) : 0;
  const over = lim != null && spent > lim;
  const atRisk = lim != null && !over && spent >= lim * 0.8;
  const barColor = over
    ? 'bg-status-broken'
    : atRisk
      ? 'bg-status-atrisk'
      : 'bg-status-ontrack';
  const statusText =
    lim == null
      ? 'Sem limite definido'
      : over
        ? 'Atenção: limite estourado'
        : atRisk
          ? 'Perto do limite'
          : 'Você está dentro do limite';
  const statusColor = over
    ? 'text-status-broken'
    : atRisk
      ? 'text-status-atrisk'
      : 'text-status-ontrack';

  // Expenses by category → donut segments + legend.
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of finance.transactions) {
      if (t.type !== 'expense') continue;
      const k = t.category ?? 'outros';
      map.set(k, (map.get(k) ?? 0) + Number(t.amount_brl));
    }
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }, [finance.transactions]);

  const canAdd = Number(amount) > 0;

  return (
    <main className="flex min-h-screen flex-col gap-5 px-5 pb-28 pt-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="press text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5">
          <ThiingsAsset assetKey="finances" size={30} />
          <h1 className="text-xl font-semibold">Finanças</h1>
        </div>
      </header>

      {/* Hero: spend vs limit + clarity status + balance */}
      <section className="hero-mission anim-rise flex flex-col gap-4 rounded-3xl p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Gasto de hoje</span>
          <span className="text-lg font-bold tabular-nums">
            <span className={over ? 'text-status-broken' : 'text-foreground'}>
              <CountUp value={spent} format={brl} />
            </span>
            {lim != null ? (
              <span className="text-sm font-medium text-muted-foreground">
                {' / '}
                {brl(lim)}
              </span>
            ) : null}
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className={cn('text-sm font-semibold', statusColor)}>{statusText}</p>

        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-base font-semibold tabular-nums text-status-ontrack">
              <CountUp value={finance.income} format={brl} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p
              className={cn(
                'text-base font-semibold tabular-nums',
                balance >= 0 ? 'text-status-ontrack' : 'text-status-broken',
              )}
            >
              <CountUp value={balance} format={brl} />
            </p>
          </div>
        </div>
      </section>

      {/* Donut breakdown */}
      {byCategory.length > 0 ? (
        <section
          className="surface-2 anim-rise flex items-center gap-4 rounded-3xl p-5"
          style={{ animationDelay: '80ms' }}
        >
          <Donut
            size={128}
            stroke={16}
            segments={byCategory.map((c) => ({
              value: c.value,
              color: categoryColor(c.key),
            }))}
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Gasto
            </span>
            <span className="text-sm font-bold tabular-nums">
              <CountUp value={spent} format={brl} />
            </span>
          </Donut>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {byCategory.slice(0, 5).map((c) => {
              const meta = categoryMeta(c.key);
              const share = spent > 0 ? Math.round((c.value / spent) * 100) : 0;
              return (
                <div key={c.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `hsl(${categoryColor(c.key)})` }}
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {meta.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {share}%
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {brl(c.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Quick add */}
      <section
        className="surface-2 anim-rise flex flex-col gap-3 rounded-3xl p-5"
        style={{ animationDelay: '160ms' }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategory(t === 'expense' ? 'alimentacao' : 'salario');
              }}
              className={cn(
                'press min-h-10 rounded-xl border text-sm font-medium transition-colors',
                type === t
                  ? t === 'expense'
                    ? 'border-status-broken/50 bg-status-broken/10 text-status-broken'
                    : 'border-status-ontrack/50 bg-status-ontrack/10 text-status-ontrack'
                  : 'border-border text-muted-foreground',
              )}
            >
              {t === 'expense' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Valor (R$)"
          className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/60"
        />

        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                'press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                category === c.key
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              <ThiingsAsset assetKey={c.icon} size={16} />
              {c.label}
            </button>
          ))}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
        />

        <button
          type="button"
          disabled={!canAdd || logTransaction.isPending}
          onClick={() => {
            logTransaction.mutate({
              type,
              amount: Number(amount),
              category,
              note: note.trim() || null,
            });
            setAmount('');
            setNote('');
          }}
          className="press min-h-11 w-full cursor-pointer rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Registrar
        </button>
      </section>

      {/* Today's transactions */}
      {finance.transactions.length > 0 ? (
        <section
          className="anim-rise flex flex-col gap-2"
          style={{ animationDelay: '240ms' }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Lançamentos de hoje
          </h2>
          {finance.transactions.map((t) => {
            const meta = categoryMeta(t.category);
            return (
              <div key={t.id} className="surface-1 flex items-center gap-3 rounded-xl p-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `hsl(${categoryColor(t.category)} / 0.18)` }}
                >
                  <ThiingsAsset assetKey={meta.icon} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{meta.label}</p>
                  {t.note ? (
                    <p className="truncate text-xs text-muted-foreground">{t.note}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold tabular-nums',
                    t.type === 'expense' ? 'text-status-broken' : 'text-status-ontrack',
                  )}
                >
                  {t.type === 'expense' ? '-' : '+'}
                  {brl(Number(t.amount_brl))}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTransaction.mutate(t.id)}
                  aria-label="Remover"
                  className="shrink-0 text-muted-foreground hover:text-status-broken"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento hoje. Registre sua primeira despesa ou receita.
        </p>
      )}
    </main>
  );
}
