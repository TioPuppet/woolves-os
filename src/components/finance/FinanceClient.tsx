'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFinance } from '@/hooks/useFinance';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryMeta,
  type FinanceToday,
} from '@/lib/finance';
import { ThiingsAsset } from '@/components/ThiingsAsset';
import { cn } from '@/lib/utils';

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
  const pct = lim ? Math.min(100, Math.round((spent / lim) * 100)) : 0;
  const over = lim != null && spent > lim;
  const atRisk = lim != null && !over && spent >= lim * 0.8;
  const barColor = over
    ? 'bg-status-broken'
    : atRisk
      ? 'bg-status-atrisk'
      : 'bg-status-ontrack';

  const canAdd = Number(amount) > 0;

  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 pb-28 pt-10">
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

      {/* Daily limit status */}
      <section className="surface-2 flex flex-col gap-3 rounded-3xl p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Gasto de hoje</span>
          <span className="text-sm">
            <span
              className={cn(
                'font-semibold',
                over ? 'text-status-broken' : 'text-foreground',
              )}
            >
              {brl(spent)}
            </span>
            {lim != null ? (
              <span className="text-muted-foreground"> / {brl(lim)}</span>
            ) : null}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn(over ? 'text-status-broken' : atRisk ? 'text-status-atrisk' : 'text-status-ontrack')}>
            {lim == null ? 'Sem limite definido' : over ? 'Limite estourado' : atRisk ? 'Perto do limite' : 'Dentro do limite'}
          </span>
          <span className="text-muted-foreground">
            Receita: <span className="font-medium text-status-ontrack">{brl(finance.income)}</span>
          </span>
        </div>
      </section>

      {/* Quick add */}
      <section className="surface-2 flex flex-col gap-3 rounded-3xl p-5">
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
          className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
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
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Hoje
          </h2>
          {finance.transactions.map((t) => {
            const meta = categoryMeta(t.category);
            return (
              <div
                key={t.id}
                className="surface-1 flex items-center gap-3 rounded-xl p-3"
              >
                <ThiingsAsset assetKey={meta.icon} size={26} />
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
